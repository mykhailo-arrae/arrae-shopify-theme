import { findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'

const RESULTS_CONTAINER_SELECTOR = '.js-search-results-container'
const REQUIRE_PRODUCT_TYPE_ATTR = 'data-require-search-type-product'

const ensureProductSearchType = (): void => {
  const url = new URL(window.location.href)

  if (url.searchParams.get('type') === 'product') {
    return
  }

  url.searchParams.set('type', 'product')
  window.location.replace(url.href)
}

initSection('.js-search-section', (section) => {
  const resultsContainer = findOneElement(section, RESULTS_CONTAINER_SELECTOR)

  if (resultsContainer?.hasAttribute(REQUIRE_PRODUCT_TYPE_ATTR)) {
    ensureProductSearchType()
  }

  return {
    unload: () => {}
  }
})
