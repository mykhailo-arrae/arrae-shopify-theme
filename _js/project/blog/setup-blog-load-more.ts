import z from 'zod'
import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { safeAwait } from '../../core/errors/safe-await.js'
import { getText } from '../../core/network/get-text.js'
import { emitSnippetEvent } from '../../core/shopify/events/snippet/index.js'

const ROOT_SELECTOR = '.js-blog-load-more-root'
const RESULTS_SELECTOR = '.js-blog-results'
const GRID_SELECTOR = '.js-blog-grid'
const BUTTON_SELECTOR = '.js-blog-load-more'
const COUNT_SELECTOR = '.js-blog-load-more-count'
const COUNT_VALUE_SELECTOR = '.js-blog-load-more-count-value'
const TOTAL_VALUE_SELECTOR = '.js-blog-load-more-total-value'
const ERROR_SELECTOR = '.js-blog-load-more-error'
const ARTICLE_ITEM_SELECTOR = '[data-article-id]'
const HIDDEN_ITEM_SELECTOR = `${ARTICLE_ITEM_SELECTOR}[hidden]`
const PORTABLE_SNIPPET_SELECTOR = '.portable-snippet[data-snippet-name]'
const RENDERED_NATIVE_PAGE_ATTR = 'data-rendered-native-page'

const FETCH_ERROR_MESSAGE = 'Something went wrong. Please try again.'
const DEFAULT_PER_PAGE = 6

const SectionRenderingJson = z.record(z.string(), z.string().nullable())

const parseIntAttr = (
  element: Element | null,
  attribute: string,
  fallback: number
): number => {
  const raw = element?.getAttribute(attribute)
  if (raw == null) {
    return fallback
  }
  const value = Number.parseInt(raw, 10)
  return Number.isNaN(value) ? fallback : value
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

const buildSectionFetchUrl = (sectionId: string, nativePage: number): URL => {
  const url = new URL(window.location.pathname, window.location.origin)
  const params = new URLSearchParams(window.location.search)
  params.delete('section_id')
  params.delete('sections')
  params.delete('page')
  params.set('section_id', sectionId)
  params.set('page', String(nativePage))
  url.search = params.toString()
  return url
}

const buildFullPageFetchUrl = (nativePage: number): URL => {
  const url = new URL(window.location.pathname, window.location.origin)
  const params = new URLSearchParams(window.location.search)
  params.delete('section_id')
  params.delete('sections')
  params.set('page', String(nativePage))
  url.search = params.toString()
  return url
}

const resolveSectionId = (
  section: HTMLElement,
  resultsRegion: HTMLElement
): string => {
  const fromData = resultsRegion.getAttribute('data-section-id')
  if (fromData != null && fromData.length > 0) {
    return fromData
  }

  return section.id.replace(/^shopify-section-/, '')
}

const parseSectionRenderingJson = (
  raw: string
): Record<string, string | null> | null => {
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = SectionRenderingJson.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

const parseResponseDocument = (
  responseHtml: string,
  sectionId: string
): Document => {
  const trimmed = responseHtml.trim()

  if (trimmed.startsWith('{')) {
    const data = parseSectionRenderingJson(trimmed)
    if (data != null) {
      const sectionHtml = data[sectionId] ?? Object.values(data)[0] ?? ''
      if (sectionHtml != null && sectionHtml.length > 0) {
        return new DOMParser().parseFromString(sectionHtml, 'text/html')
      }
    }
  }

  return new DOMParser().parseFromString(responseHtml, 'text/html')
}

const findGridInDocument = (document: Document): HTMLElement | null => {
  return (
    findOneElement(document, GRID_SELECTOR) ??
    findOneElement(document, `${RESULTS_SELECTOR} ${GRID_SELECTOR}`)
  )
}

const findSectionRoot = (
  document: Document,
  sectionId: string
): HTMLElement | null => {
  const sectionRoot = document.getElementById(`shopify-section-${sectionId}`)
  return sectionRoot instanceof HTMLElement ? sectionRoot : null
}

const getRenderedNativePage = (document: Document): number | null => {
  const resultsRegion = findOneElement(document, RESULTS_SELECTOR)
  if (resultsRegion == null) {
    return null
  }

  const raw = resultsRegion.getAttribute(RENDERED_NATIVE_PAGE_ATTR)
  if (raw == null) {
    return null
  }

  const value = Number.parseInt(raw, 10)
  return Number.isNaN(value) ? null : value
}

const getPageFromUrl = (): number => {
  const raw = new URLSearchParams(window.location.search).get('page')
  if (raw == null) {
    return 1
  }
  const value = Number.parseInt(raw, 10)
  return Number.isNaN(value) || value < 1 ? 1 : value
}

export type BlogLoadMoreController = {
  destroy: () => void
}

export const setupBlogLoadMore = (
  section: HTMLElement
): BlogLoadMoreController => {
  const namespace = makeEventNamespace()

  const resultsRegion = findOneElement(section, RESULTS_SELECTOR)
  const root = findOneElement(section, ROOT_SELECTOR)
  const grid =
    resultsRegion != null ? findOneElement(resultsRegion, GRID_SELECTOR) : null

  if (resultsRegion == null || root == null || grid == null) {
    return {
      destroy: () => {
        namespace.destroy()
      }
    }
  }

  const sectionId = resolveSectionId(section, resultsRegion)

  const totalArticles = parseIntAttr(root, 'data-total', 0)
  const nativePages = parseIntAttr(root, 'data-native-pages', 1)
  const perPage = Math.max(
    1,
    parseIntAttr(root, 'data-per-page', DEFAULT_PER_PAGE)
  )
  let nativePage = Math.max(
    parseIntAttr(root, 'data-native-page', 1),
    getPageFromUrl()
  )

  const knownArticleIds = new Set<string>()
  findElements(grid, ARTICLE_ITEM_SELECTOR).forEach((item) => {
    if (item.hidden) {
      return
    }
    const id = item.getAttribute('data-article-id')
    if (id != null && id.length > 0) {
      knownArticleIds.add(id)
    }
  })

  let isLoading = false
  let isUnloaded = false

  const getLoadMoreButton = (): HTMLButtonElement | null => {
    const button = findOneElement(section, BUTTON_SELECTOR)
    return button instanceof HTMLButtonElement ? button : null
  }

  const setBusy = (busy: boolean): void => {
    isLoading = busy
    const button = getLoadMoreButton()
    if (button != null) {
      if (busy) {
        button.setAttribute('disabled', '')
      } else {
        button.removeAttribute('disabled')
      }
      button.setAttribute('aria-busy', busy ? 'true' : 'false')
    }
    resultsRegion.setAttribute('aria-busy', busy ? 'true' : 'false')
  }

  const hidePagination = (): void => {
    root.hidden = true
  }

  const setError = (message: string | null): void => {
    const errorBanner = findOneElement(section, ERROR_SELECTOR)
    if (errorBanner == null) {
      return
    }
    if (message == null) {
      errorBanner.textContent = ''
      errorBanner.hidden = true
    } else {
      errorBanner.textContent = message
      errorBanner.hidden = false
    }
  }

  const updateCount = (): void => {
    const countValue = findOneElement(section, COUNT_VALUE_SELECTOR)
    const totalValue = findOneElement(section, TOTAL_VALUE_SELECTOR)
    const countText = findOneElement(section, COUNT_SELECTOR)

    if (countValue != null) {
      countValue.textContent = String(knownArticleIds.size)
    }
    if (totalValue != null) {
      totalValue.textContent = String(totalArticles)
    }
    if (countText != null) {
      countText.setAttribute(
        'aria-label',
        `${knownArticleIds.size} out of ${totalArticles} articles`
      )
    }
  }

  const isComplete = (): boolean => knownArticleIds.size >= totalArticles

  const revealHiddenItems = (limit: number): HTMLElement[] => {
    const hiddenItems = findElements(grid, HIDDEN_ITEM_SELECTOR)
    const revealed: HTMLElement[] = []

    for (const item of hiddenItems) {
      if (revealed.length >= limit) {
        break
      }
      item.hidden = false
      revealed.push(item)
    }

    return revealed
  }

  const getGridArticleIds = (): Set<string> => {
    const ids = new Set<string>()
    findElements(grid, ARTICLE_ITEM_SELECTOR).forEach((item) => {
      const id = item.getAttribute('data-article-id')
      if (id != null && id.length > 0) {
        ids.add(id)
      }
    })
    return ids
  }

  const parseNewItemsFromGrid = (parsedGrid: HTMLElement): HTMLElement[] => {
    const gridIds = getGridArticleIds()

    return findElements(parsedGrid, ARTICLE_ITEM_SELECTOR).filter((item) => {
      const id = item.getAttribute('data-article-id')
      if (id == null || id.length === 0) {
        return false
      }
      if (knownArticleIds.has(id) || gridIds.has(id)) {
        return false
      }
      return true
    })
  }

  const parseNewItemsFromFullPage = (responseHtml: string): HTMLElement[] => {
    const parsed = parseResponseDocument(responseHtml, sectionId)
    const sectionRoot = findSectionRoot(parsed, sectionId)
    const parsedGrid =
      sectionRoot != null
        ? findOneElement(sectionRoot, GRID_SELECTOR)
        : findGridInDocument(parsed)

    if (parsedGrid == null) {
      return []
    }

    return parseNewItemsFromGrid(parsedGrid)
  }

  const appendItems = (items: HTMLElement[]): void => {
    if (items.length === 0) {
      return
    }
    const fragment = document.createDocumentFragment()
    items.forEach((item) => {
      fragment.appendChild(item)
    })
    grid.appendChild(fragment)
  }

  const reinitializeSnippets = (items: HTMLElement[]): void => {
    items.forEach((item) => {
      const snippets = findElements(item, PORTABLE_SNIPPET_SELECTOR).sort(
        (a, b) => depthFromAncestor(b, item) - depthFromAncestor(a, item)
      )
      snippets.forEach((portableSnippet) => {
        try {
          emitSnippetEvent(portableSnippet, {
            type: 'portable:snippet:load',
            mode: 'self-only'
          })
        } catch (err) {
          console.error('blog-load-more: failed to init snippet', err)
        }
      })
    })
    document.dispatchEvent(new CustomEvent('portable:web-component:load'))
  }

  const registerRevealedItems = (items: HTMLElement[]): void => {
    items.forEach((item) => {
      const id = item.getAttribute('data-article-id')
      if (id != null && id.length > 0) {
        knownArticleIds.add(id)
      }
    })
  }

  const fetchResponseHtml = async (url: URL): Promise<string | null> => {
    const [fetchError, responseHtml] = await safeAwait(getText({ url }))

    if (isUnloaded) {
      return null
    }

    if (fetchError != null || responseHtml == null) {
      console.error('blog-load-more: fetch failed', fetchError)
      throw new Error(FETCH_ERROR_MESSAGE)
    }

    return responseHtml
  }

  const fetchNativeChunk = async (page: number): Promise<HTMLElement[]> => {
    const sectionHtml = await fetchResponseHtml(
      buildSectionFetchUrl(sectionId, page)
    )

    if (sectionHtml == null) {
      return []
    }

    const sectionDocument = parseResponseDocument(sectionHtml, sectionId)
    const renderedPage = getRenderedNativePage(sectionDocument)
    const sectionGrid = findGridInDocument(sectionDocument)
    let items = sectionGrid != null ? parseNewItemsFromGrid(sectionGrid) : []

    const needsFallback = page > 1 && items.length === 0

    if (!needsFallback) {
      return items
    }

    const fullPageHtml = await fetchResponseHtml(buildFullPageFetchUrl(page))

    if (fullPageHtml == null) {
      return items
    }

    items = parseNewItemsFromFullPage(fullPageHtml)

    if (items.length === 0) {
      console.warn('blog-load-more: no new articles after full-page fallback', {
        sectionId,
        requestedPage: page,
        renderedPage
      })
    }

    return items
  }

  const handleLoadMore = async (): Promise<void> => {
    if (isLoading || root.hidden) {
      return
    }

    setError(null)
    setBusy(true)

    let addedItems: HTMLElement[] = []

    try {
      let remaining = perPage

      const hiddenInDom = findElements(grid, HIDDEN_ITEM_SELECTOR)
      if (hiddenInDom.length > 0) {
        const revealed = revealHiddenItems(remaining)
        registerRevealedItems(revealed)
        addedItems = revealed
        remaining -= revealed.length
      }

      while (remaining > 0 && !isComplete() && nativePage < nativePages) {
        const nextNativePage = nativePage + 1
        const chunkItems = await fetchNativeChunk(nextNativePage)

        if (isUnloaded) {
          return
        }

        if (chunkItems.length === 0) {
          console.warn(
            'blog-load-more: native chunk returned no new articles',
            {
              sectionId,
              requestedPage: nextNativePage,
              nativePages
            }
          )
          break
        }

        nativePage = nextNativePage
        root.setAttribute('data-native-page', String(nativePage))

        chunkItems.forEach((item) => {
          item.hidden = true
        })
        appendItems(chunkItems)

        const revealed = revealHiddenItems(remaining)
        registerRevealedItems(revealed)
        addedItems = addedItems.concat(revealed)
        remaining -= revealed.length

        if (revealed.length === 0) {
          break
        }
      }

      if (addedItems.length === 0 && !isComplete()) {
        setError(FETCH_ERROR_MESSAGE)
        return
      }

      reinitializeSnippets(addedItems)
      updateCount()

      if (isComplete()) {
        const focusTarget = addedItems[0]
        if (focusTarget != null) {
          focusTarget.setAttribute('tabindex', '-1')
          focusTarget.focus({ preventScroll: true })
        }
        hidePagination()
      }
    } catch (err) {
      console.error('blog-load-more: load failed', err)
      if (addedItems.length > 0) {
        reinitializeSnippets(addedItems)
        updateCount()
        if (isComplete()) {
          hidePagination()
        }
      }
      setError(FETCH_ERROR_MESSAGE)
    } finally {
      setBusy(false)
    }
  }

  namespace.addDelegatedEventListener(
    section,
    BUTTON_SELECTOR,
    'click',
    (target, event) => {
      event.preventDefault()
      void handleLoadMore()
    }
  )

  if (isComplete()) {
    hidePagination()
  }

  return {
    destroy: () => {
      isUnloaded = true
      setBusy(false)
      namespace.destroy()
    }
  }
}
