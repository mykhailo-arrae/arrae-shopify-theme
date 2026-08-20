import { isHTMLElement } from '../../core/dom/guards.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { atShopifyRoot } from '../../core/network/shopify-root.js'
import { emitSnippetEvent } from '../../core/shopify/events/snippet/index.js'

/**
 * `section_id` passed to Shopify's predictive search (`/search/suggest`) so the
 * response is rendered with this theme section's markup.
 */
export const SEARCH_DRAWER_SUGGEST_SECTION_ID = 'search-drawer'

/**
 * Parses an HTML string into a document root element for querying with
 * `findOneElement` / DOM APIs (used for suggest response bodies).
 *
 * @param input - Raw HTML from XHR; `null` or empty yields no document.
 * @returns The parsed document's `documentElement`, or `null` if `input` is falsy.
 */
export const decodeTextToHTML = (input: string | null): HTMLElement | null => {
  if (!input) {
    return null
  }
  const doc = new DOMParser().parseFromString(input, 'text/html')
  return doc.documentElement
}

/**
 * Keeps the "View all" link `href` in sync with `data-base-url` after new
 * suggest results (same query shape as the Search page: `/search?q=…`).
 *
 * @param section - The search drawer section root.
 */
export const updateViewAllResultsLink = (section: Element): void => {
  const viewAllLink = findOneElement(section, '.js-view-all-results')
  if (viewAllLink instanceof HTMLAnchorElement) {
    const baseUrl = viewAllLink.getAttribute('data-base-url')
    if (baseUrl) {
      viewAllLink.href = baseUrl
    }
  }
}

const PORTABLE_SNIPPET_WITH_NAME = '.portable-snippet[data-snippet-name]'

const depthFromAncestor = (el: Element, ancestor: Element): number => {
  let depth = 0
  let current: Element | null = el
  while (current != null && current !== ancestor) {
    depth += 1
    current = current.parentElement
  }
  return depth
}

/**
 * Dispatches `portable:snippet:load` so the asset loader pulls snippet JS (if needed)
 * and `initSnippet` runs (e.g. `product-widget` add-to-cart).
 *
 * Uses `mode: 'self-only'` and deepest-first order so nested snippets (e.g. `core-button`
 * inside `product-widget`) initialize reliably after XHR/HTML injection.
 * Deferred one microtask so injected nodes are committed before dispatch.
 *
 * @param container - Node whose descendants may include portable snippets.
 */
export const initializePortableSnippets = (container: Element): void => {
  queueMicrotask(() => {
    const snippets = findElements(container, PORTABLE_SNIPPET_WITH_NAME)
    const sorted = [...snippets].sort(
      (a, b) =>
        depthFromAncestor(b, container) - depthFromAncestor(a, container)
    )

    sorted.forEach((snippet) => {
      try {
        emitSnippetEvent(snippet, {
          type: 'portable:snippet:load',
          mode: 'self-only'
        })
      } catch (err: unknown) {
        console.error('Failed to initialize portable snippet', snippet, err)
      }
    })
  })
}

/**
 * Predictive search URL: `q` and `section_id` only. Extra product rows are hidden
 * client-side to match `max_products` (see `applyPredictiveSearchResults`).
 *
 * @param query - Search string (encoded by `URLSearchParams`).
 * @returns Absolute URL for the current origin (respects `Shopify.routes.root`).
 */
export const buildPredictiveSuggestUrl = (query: string): URL => {
  const url = atShopifyRoot('search/suggest')
  url.searchParams.set('q', query)
  url.searchParams.set('section_id', SEARCH_DRAWER_SUGGEST_SECTION_ID)
  return url
}

/**
 * Hides result rows beyond the theme-configured max for one resource column.
 *
 * @param wrapper - Element whose direct children are result rows, or `null`.
 * @param maxVisible - Zero-based exclusive cap (children at index >= this are hidden).
 */
const clampWrapperChildren = (
  wrapper: Element | null,
  maxVisible: number
): void => {
  if (!wrapper) {
    return
  }
  const items = Array.from(wrapper.children)
  items.forEach((item, index) => {
    if (isHTMLElement(item) && index >= maxVisible) {
      item.style.display = 'none'
    }
  })
}

/** Arguments for {@link applyPredictiveSearchResults}. */
export type ApplyPredictiveSearchResultsArgs = {
  /** Drawer section root receiving the updated markup. */
  section: Element
  /** Parsed suggest response document root (from {@link decodeTextToHTML}). */
  parsedHTML: HTMLElement
  maxProducts: number
  /**
   * HTML snapshot of recommendations when the drawer first opened; used to
   * restore the empty-state block if suggest returns a shell without results.
   */
  initialRecommendationsHTML: string
}

/**
 * Merges suggest HTML into the live drawer: replaces results, clamps list lengths,
 * optionally restores initial recommendations, re-inits portable snippets, and
 * refreshes the "View all" link.
 *
 * @param args - See {@link ApplyPredictiveSearchResultsArgs}.
 */
export const applyPredictiveSearchResults = ({
  section,
  parsedHTML,
  maxProducts,
  initialRecommendationsHTML
}: ApplyPredictiveSearchResultsArgs): void => {
  const newSearchResults = findOneElement(parsedHTML, '.js-search-results')
  if (!newSearchResults) {
    return
  }

  const searchResultsContainer = findOneElement(section, '.js-search-results')
  if (!searchResultsContainer) {
    return
  }

  searchResultsContainer.innerHTML = newSearchResults.innerHTML

  clampWrapperChildren(
    findOneElement(searchResultsContainer, '[data-resource-type="products"]'),
    maxProducts
  )

  const recommendationsContainer = findOneElement(
    searchResultsContainer,
    '.js-predictive-search-results'
  )

  if (recommendationsContainer) {
    const activeResource = recommendationsContainer.getAttribute(
      'data-active-resource'
    )
    const isEmptyResultsContent =
      activeResource === null || activeResource === ''

    if (isEmptyResultsContent && initialRecommendationsHTML) {
      recommendationsContainer.innerHTML = initialRecommendationsHTML
    }
  }

  initializePortableSnippets(searchResultsContainer)

  const updatedRecommendationsContainer = findOneElement(
    searchResultsContainer,
    '.js-predictive-search-results'
  )

  if (updatedRecommendationsContainer) {
    updateViewAllResultsLink(section)
  }
}
