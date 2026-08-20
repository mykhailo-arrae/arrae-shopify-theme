import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { safeAwait } from '../../core/errors/safe-await.js'
import { getText } from '../../core/network/get-text.js'
import { emitSnippetEvent } from '../../core/shopify/events/snippet/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'

const ROOT_SELECTOR = '.js-load-more-root'
const RESULTS_SELECTOR = '.js-collection-results'
const GRID_SELECTOR = '.js-collection-grid'
const BUTTON_SELECTOR = '.js-load-more'
const COUNT_SELECTOR = '.js-load-more-count'
const ERROR_SELECTOR = '.js-load-more-error'
const PRODUCT_ITEM_SELECTOR = '[data-product-id]'
const PORTABLE_SNIPPET_SELECTOR = '.portable-snippet[data-snippet-name]'

const COUNT_PLACEHOLDER = '[COUNT]'
const TOTAL_PLACEHOLDER = '[TOTAL]'
const DEFAULT_COUNT_TEMPLATE = `${COUNT_PLACEHOLDER} out of ${TOTAL_PLACEHOLDER} products`
const FETCH_ERROR_MESSAGE = 'Something went wrong. Please try again.'

/**
 * Appended products receive a monotonically increasing grid order so the
 * 1-column mobile layout (which sorts items by `--grid-order`) keeps them after
 * the first server-rendered page. First-page orders are small (<= per page + 1).
 */
const APPENDED_ORDER_START = 1000

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

const formatCount = (template: string, loaded: number, total: number): string =>
  template
    .replaceAll(COUNT_PLACEHOLDER, String(loaded))
    .replaceAll(TOTAL_PLACEHOLDER, String(total))

/**
 * Section Rendering API URL for `page` of the current collection. The current
 * query string is preserved so active filters/sort are respected, with
 * `section_id` and `page` set explicitly.
 */
const buildSectionFetchUrl = (sectionId: string, page: number): URL => {
  const url = new URL(window.location.pathname, window.location.origin)
  const params = new URLSearchParams(window.location.search)
  params.delete('section_id')
  params.delete('page')
  params.set('section_id', sectionId)
  params.set('page', String(page))
  url.search = params.toString()
  return url
}

initSnippet('collection-load-more', (snippet, section) => {
  const namespace = makeEventNamespace()

  const root = findOneElement(snippet, ROOT_SELECTOR)
  const button = findOneElement(snippet, BUTTON_SELECTOR)
  const countText = findOneElement(snippet, COUNT_SELECTOR)
  const errorBanner = findOneElement(snippet, ERROR_SELECTOR)

  const resultsRegion = snippet.closest(RESULTS_SELECTOR)
  const region = resultsRegion instanceof HTMLElement ? resultsRegion : section
  const grid = findOneElement(region, GRID_SELECTOR)

  // No grid/button means an empty collection (or markup change) — stay inert.
  if (root == null || button == null || grid == null || region == null) {
    return () => {
      namespace.destroy()
    }
  }

  const sectionId = region.getAttribute('data-section-id') ?? ''
  const countTemplate =
    countText?.getAttribute('data-template') ?? DEFAULT_COUNT_TEMPLATE

  const totalProducts = parseIntAttr(root, 'data-total', 0)
  const totalPages = parseIntAttr(root, 'data-total-pages', 1)
  let currentPage = parseIntAttr(root, 'data-current-page', 1)

  const knownProductIds = new Set<string>()
  findElements(grid, PRODUCT_ITEM_SELECTOR).forEach((item) => {
    const id = item.getAttribute('data-product-id')
    if (id != null && id.length > 0) {
      knownProductIds.add(id)
    }
  })

  let isLoading = false
  let isUnloaded = false
  let appendedOrder = APPENDED_ORDER_START

  // Mirror the collection-tag switch loading pattern: dim + lock the results
  // region (`.js-collection-results[aria-busy]`) and disable the button so it
  // cannot be clicked again while a page is in flight.
  const setBusy = (busy: boolean): void => {
    isLoading = busy
    if (busy) {
      button.setAttribute('disabled', '')
    } else {
      button.removeAttribute('disabled')
    }
    button.setAttribute('aria-busy', busy ? 'true' : 'false')
    region.setAttribute('aria-busy', busy ? 'true' : 'false')
  }

  // When there is nothing more to load, hide the whole block (button + count)
  // so the pagination count is only shown while pagination is available.
  const hidePagination = (): void => {
    button.hidden = true
    root.hidden = true
  }

  const setError = (message: string | null): void => {
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
    if (countText != null) {
      countText.textContent = formatCount(
        countTemplate,
        knownProductIds.size,
        totalProducts
      )
    }
  }

  const isComplete = (): boolean =>
    currentPage >= totalPages || knownProductIds.size >= totalProducts

  const parseNewItems = (responseHtml: string): HTMLElement[] => {
    const parsed = new DOMParser().parseFromString(responseHtml, 'text/html')
    const parsedGrid = findOneElement(parsed, GRID_SELECTOR)
    if (parsedGrid == null) {
      return []
    }
    return findElements(parsedGrid, PRODUCT_ITEM_SELECTOR).filter((item) => {
      const id = item.getAttribute('data-product-id')
      if (id == null || id.length === 0 || knownProductIds.has(id)) {
        return false
      }
      knownProductIds.add(id)
      return true
    })
  }

  const appendItems = (items: HTMLElement[]): void => {
    if (items.length === 0) {
      return
    }
    const fragment = document.createDocumentFragment()
    items.forEach((item) => {
      item.style.setProperty('--grid-order', String(appendedOrder))
      appendedOrder += 1
      fragment.appendChild(item)
    })
    grid.appendChild(fragment)
  }

  // Hydrate JS-driven product cards (and any nested core-* snippets) in the
  // appended markup. Deepest-first + self-only mirrors the rest of the theme.
  const reinitializeProductCards = (items: HTMLElement[]): void => {
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
          console.error('collection-load-more: failed to init snippet', err)
        }
      })
    })
    document.dispatchEvent(new CustomEvent('portable:web-component:load'))
  }

  const handleLoadMore = async (): Promise<void> => {
    if (isLoading || button.hidden) {
      return
    }

    const nextPage = currentPage + 1
    if (nextPage > totalPages) {
      button.hidden = true
      return
    }

    setError(null)
    setBusy(true)

    const [fetchError, responseHtml] = await safeAwait(
      getText({ url: buildSectionFetchUrl(sectionId, nextPage) })
    )

    if (isUnloaded) {
      return
    }

    if (fetchError != null || responseHtml == null) {
      console.error('collection-load-more: fetch failed', fetchError)
      setError(FETCH_ERROR_MESSAGE)
      setBusy(false)
      return
    }

    const newItems = parseNewItems(responseHtml)
    currentPage = nextPage

    if (newItems.length > 0) {
      appendItems(newItems)
      reinitializeProductCards(newItems)
    }

    updateCount()
    setBusy(false)

    if (isComplete()) {
      // Keep keyboard focus near the new content before the block disappears,
      // instead of dropping focus to the body.
      const focusTarget = newItems[0]
      if (focusTarget != null) {
        focusTarget.setAttribute('tabindex', '-1')
        focusTarget.focus({ preventScroll: true })
      }
      hidePagination()
    }
  }

  namespace.addDirectEventListener(button, 'click', () => {
    void handleLoadMore()
  })

  // The server already renders the correct count and hidden state; only ensure
  // the block is hidden when there is nothing more to load (defensive).
  if (isComplete()) {
    hidePagination()
  }

  return () => {
    isUnloaded = true
    namespace.destroy()
  }
})
