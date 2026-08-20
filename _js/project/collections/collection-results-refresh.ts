import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { safeAwait } from '../../core/errors/safe-await.js'
import { getText } from '../../core/network/get-text.js'
import { atShopifyRoot } from '../../core/network/shopify-root.js'
import { emitSnippetEvent } from '../../core/shopify/events/snippet/index.js'

const RESULTS_SELECTOR = '.js-collection-results'
const STATUS_SELECTOR = '.js-collection-status'
const PORTABLE_SNIPPET_SELECTOR = '.portable-snippet[data-snippet-name]'

const SWAPPABLE_DRAWERS = [
  {
    root: '.portable-snippet[data-snippet-name="collection-filters"]',
    body: '.js-filters-body'
  }
] as const

const COLLECTION_PATH = /\/collections\/([^/?#]+)/

const FILTERS_APPLY_EVENT = 'collection:filters-apply'
const FILTER_PARAM_PREFIX = 'filter.'

/** Extracts only `filter.*` and `sort_by` from a query string. */
const collectFilterSort = (params: URLSearchParams): URLSearchParams => {
  const out = new URLSearchParams()
  params.forEach((value, key) => {
    if (key.startsWith(FILTER_PARAM_PREFIX)) {
      out.append(key, value)
    } else if (key === 'sort_by' && value !== '') {
      out.set('sort_by', value)
    }
  })
  return out
}

export type SetupCollectionResultsRefreshArgs = {
  /** The collection section root (`.js-collection-section`). */
  section: HTMLElement
  /**
   * Called after the results region has been replaced so the host section can
   * re-apply state that lives on the freshly rendered DOM (e.g. grid layout).
   */
  onContentReplaced?: () => void
}

export type CollectionResultsRefresh = {
  destroy: () => void
}

const handleFromPath = (path: string): string | null => {
  const match = COLLECTION_PATH.exec(path)
  const handle = match?.[1]
  return handle != null && handle.length > 0 ? decodeURIComponent(handle) : null
}

const depthFromAncestor = (element: Element, ancestor: Element): number => {
  let depth = 0
  let current: Element | null = element
  while (current != null && current !== ancestor) {
    depth += 1
    current = current.parentElement
  }
  return depth
}

const reinitializePortableSnippets = (container: HTMLElement): void => {
  const snippets = findElements(container, PORTABLE_SNIPPET_SELECTOR).sort(
    (a, b) => depthFromAncestor(b, container) - depthFromAncestor(a, container)
  )

  snippets.forEach((snippet) => {
    try {
      emitSnippetEvent(snippet, {
        type: 'portable:snippet:load',
        mode: 'self-only'
      })
    } catch (err) {
      console.error(
        'collection-results-refresh: failed to init portable snippet',
        err
      )
    }
  })

  document.dispatchEvent(new CustomEvent('portable:web-component:load'))
}

const unloadPortableSnippets = (container: HTMLElement): void => {
  const topLevelSnippets = findElements(
    container,
    PORTABLE_SNIPPET_SELECTOR
  ).filter((snippet) => {
    const parentSnippet = snippet.parentElement?.closest(
      PORTABLE_SNIPPET_SELECTOR
    )
    return parentSnippet == null || !container.contains(parentSnippet)
  })

  topLevelSnippets.forEach((snippet) => {
    try {
      emitSnippetEvent(snippet, { type: 'portable:snippet:unload' })
    } catch (err) {
      console.error(
        'collection-results-refresh: failed to unload portable snippet',
        err
      )
    }
  })
}

const collectionUrl = (handle: string, search?: URLSearchParams): URL => {
  const url = atShopifyRoot(`collections/${handle}`)
  search?.forEach((value, key) => {
    url.searchParams.append(key, value)
  })
  return url
}

const fetchCollectionDocument = async (
  handle: string,
  sectionId: string,
  search?: URLSearchParams
): Promise<Document | null> => {
  const apiUrl = collectionUrl(handle, search)
  apiUrl.searchParams.set('section_id', sectionId)

  const [apiError, apiHtml] = await safeAwait(getText({ url: apiUrl }))
  if (apiError == null && apiHtml != null) {
    const apiDocument = new DOMParser().parseFromString(apiHtml, 'text/html')
    if (findOneElement(apiDocument, RESULTS_SELECTOR) != null) {
      return apiDocument
    }
  }

  const pageUrl = collectionUrl(handle, search)
  const [pageError, pageHtml] = await safeAwait(getText({ url: pageUrl }))
  if (pageError != null || pageHtml == null) {
    return null
  }

  return new DOMParser().parseFromString(pageHtml, 'text/html')
}

export const setupCollectionResultsRefresh = ({
  section,
  onContentReplaced
}: SetupCollectionResultsRefreshArgs): CollectionResultsRefresh => {
  const controller = new AbortController()

  const resultsRegion = findOneElement(section, RESULTS_SELECTOR)

  if (resultsRegion == null) {
    return {
      destroy: () => {
        controller.abort()
      }
    }
  }

  const sectionId = resultsRegion.getAttribute('data-section-id') ?? ''
  const loadingLabel = resultsRegion.getAttribute('data-loading-label') ?? ''
  const errorLabel = resultsRegion.getAttribute('data-error-label') ?? ''

  let currentHandle = handleFromPath(window.location.pathname)
  let activeRequestId = 0
  let destroyed = false
  let currentSearch = collectFilterSort(
    new URLSearchParams(window.location.search)
  )

  const setStatus = (message: string): void => {
    const status = findOneElement(section, STATUS_SELECTOR)
    if (status != null) {
      status.textContent = message
    }
  }

  const setBusy = (busy: boolean): void => {
    resultsRegion.setAttribute('aria-busy', busy ? 'true' : 'false')
  }

  const swapDrawerBody = (
    sourceDocument: Document,
    rootSelector: string,
    bodySelector: string
  ): void => {
    const root = findOneElement(section, rootSelector)
    const currentBody = root != null ? findOneElement(root, bodySelector) : null
    const nextBody = findOneElement(sourceDocument, bodySelector)

    if (root == null || currentBody == null || nextBody == null) {
      return
    }

    try {
      emitSnippetEvent(root, { type: 'portable:snippet:unload' })
    } catch (err) {
      console.error(
        'collection-results-refresh: failed to unload drawer snippet',
        err
      )
    }

    currentBody.innerHTML = nextBody.innerHTML

    try {
      emitSnippetEvent(root, { type: 'portable:snippet:load' })
    } catch (err) {
      console.error(
        'collection-results-refresh: failed to reload drawer snippet',
        err
      )
    }
  }

  const swapContent = (
    sourceDocument: Document,
    swapDrawers: boolean
  ): boolean => {
    const nextResults = findOneElement(sourceDocument, RESULTS_SELECTOR)
    if (nextResults == null) {
      return false
    }

    unloadPortableSnippets(resultsRegion)
    resultsRegion.innerHTML = nextResults.innerHTML
    reinitializePortableSnippets(resultsRegion)

    if (swapDrawers) {
      SWAPPABLE_DRAWERS.forEach((drawer) => {
        swapDrawerBody(sourceDocument, drawer.root, drawer.body)
      })
    }

    return true
  }

  type RefreshOptions = {
    replace?: boolean
    search?: URLSearchParams
    swapDrawers?: boolean
  }

  const refreshResults = async (
    handle: string,
    options: RefreshOptions
  ): Promise<void> => {
    const requestId = ++activeRequestId

    const search = options.search ?? new URLSearchParams()
    const swapDrawers = options.swapDrawers ?? true
    const targetUrl = collectionUrl(handle, search).toString()

    setBusy(true)
    setStatus(loadingLabel)

    const sourceDocument = await fetchCollectionDocument(
      handle,
      sectionId,
      search
    )

    if (destroyed || requestId !== activeRequestId) {
      return
    }

    if (sourceDocument == null || !swapContent(sourceDocument, swapDrawers)) {
      setBusy(false)
      setStatus(errorLabel)
      return
    }

    currentHandle = handle
    currentSearch = collectFilterSort(search)
    onContentReplaced?.()
    setBusy(false)
    setStatus('')

    if (options.replace === true) {
      window.history.replaceState(
        { collectionRefresh: true, handle },
        '',
        targetUrl
      )
    }
  }

  const handlePopState = (): void => {
    const handle = handleFromPath(window.location.pathname)
    if (handle == null) {
      return
    }
    const search = collectFilterSort(
      new URLSearchParams(window.location.search)
    )
    if (
      handle === currentHandle &&
      search.toString() === currentSearch.toString()
    ) {
      return
    }
    void refreshResults(handle, { search, swapDrawers: true })
  }

  window.addEventListener('popstate', handlePopState, {
    signal: controller.signal
  })

  document.addEventListener(
    FILTERS_APPLY_EVENT,
    (evt) => {
      if (currentHandle == null) {
        return
      }
      const detail: unknown = evt instanceof CustomEvent ? evt.detail : null
      const raw =
        detail != null &&
        typeof detail === 'object' &&
        'search' in detail &&
        typeof detail.search === 'string'
          ? detail.search
          : ''
      const search = collectFilterSort(new URLSearchParams(raw))
      void refreshResults(currentHandle, {
        replace: true,
        search,
        swapDrawers: true
      })
    },
    { signal: controller.signal }
  )

  window.history.replaceState(
    { collectionRefresh: true, handle: currentHandle },
    '',
    window.location.href
  )

  return {
    destroy: () => {
      if (destroyed) {
        return
      }
      destroyed = true
      activeRequestId += 1
      controller.abort()
    }
  }
}
