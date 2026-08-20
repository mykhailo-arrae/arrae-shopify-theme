import { debounce } from '@github/mini-throttle'
import { makeEventNamespace } from '../../core/dom/events/index.js'
import { isHTMLFormElement, isHTMLInputElement } from '../../core/dom/guards.js'
import { findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'
import {
  applyPredictiveSearchResults,
  buildPredictiveSuggestUrl,
  decodeTextToHTML,
  initializePortableSnippets,
  updateViewAllResultsLink
} from './helpers.js'

initSection('.js-drawer-search', (section) => {
  const namespace = makeEventNamespace()
  const searchContainer = findOneElement(section, '.js-search-container')
  const searchResults = findOneElement(section, '.js-search-results')
  const searchInput = findOneElement(section, '.js-search-query')
  const searchMirror = findOneElement(section, '.js-search-form-mirror')
  const searchDrawerForm = findOneElement(section, '.js-search-drawer-form')
  const clearSearchButton = findOneElement(section, '.js-clear-search')
  const closeDrawerButton = findOneElement(section, '.js-offcanvas-close')

  if (
    !searchContainer ||
    !searchInput ||
    !searchResults ||
    !clearSearchButton ||
    !closeDrawerButton ||
    !isHTMLInputElement(searchInput) ||
    !isHTMLFormElement(searchDrawerForm)
  ) {
    return {
      unload: () => {}
    }
  }

  const initialSearchResultsHTML = searchResults.innerHTML

  const initialRecommendations = findOneElement(
    searchResults,
    '.js-predictive-search-results'
  )
  const initialRecommendationsHTML = initialRecommendations?.innerHTML || ''

  initializePortableSnippets(searchResults)

  const syncSearchMirror = (): void => {
    if (!searchMirror) {
      return
    }

    searchMirror.textContent =
      searchInput.value.length > 0 ? searchInput.value : searchInput.placeholder
  }

  const updateStackedCloseState = () => {
    const hasQuery = searchInput.value.trim().length > 0

    searchDrawerForm.setAttribute('data-has-query', hasQuery ? 'true' : 'false')
    clearSearchButton.setAttribute('aria-hidden', hasQuery ? 'false' : 'true')
    clearSearchButton.tabIndex = hasQuery ? 0 : -1
    closeDrawerButton.setAttribute('aria-hidden', hasQuery ? 'true' : 'false')
    closeDrawerButton.tabIndex = hasQuery ? -1 : 0
  }

  const resetSearch = () => {
    searchInput.value = ''
    searchResults.innerHTML = initialSearchResultsHTML
    initializePortableSnippets(searchResults)
    syncSearchMirror()
    updateStackedCloseState()
  }

  const runPredictiveSearch = (query: string) => {
    if (!query) {
      return
    }

    const maxProducts = Number(
      searchContainer.getAttribute('data-max-products') ?? 6
    )

    const url = buildPredictiveSuggestUrl(query)

    const request = new XMLHttpRequest()
    request.open('GET', url.toString(), true)
    request.setRequestHeader('Accept', 'text/html')

    request.onload = () => {
      if (searchInput.value.trim() !== query) {
        return
      }

      const html =
        typeof request.responseText === 'string' ? request.responseText : ''
      const parsedHTML = decodeTextToHTML(html || '')

      if (!parsedHTML) {
        return
      }

      applyPredictiveSearchResults({
        section,
        parsedHTML,
        maxProducts,
        initialRecommendationsHTML
      })
    }

    request.onerror = () => {
      console.warn('Predictive search request failed')
    }

    request.send()
  }

  const debouncedPredictiveSearch = debounce(runPredictiveSearch, 500)

  const handleSearchInput = () => {
    const query = searchInput.value.trim()

    if (query === '') {
      resetSearch()
      return
    }

    debouncedPredictiveSearch(query)
  }

  const onDrawerSearchSubmit = (evt: Event) => {
    if (searchInput.value.trim() === '') {
      evt.preventDefault()
    }
  }

  const onSearchInput = () => {
    syncSearchMirror()
    updateStackedCloseState()
    handleSearchInput()
  }

  searchInput.addEventListener('input', onSearchInput)
  searchDrawerForm.addEventListener('submit', onDrawerSearchSubmit)

  syncSearchMirror()
  updateStackedCloseState()
  updateViewAllResultsLink(section)

  void document.fonts.ready.then(() => {
    syncSearchMirror()
  })

  const enableKeyboardNavRing = (): void => {
    searchDrawerForm.setAttribute('data-keyboard-nav', 'true')
  }

  const disableKeyboardNavRing = (): void => {
    searchDrawerForm.removeAttribute('data-keyboard-nav')
  }

  // Body `data-offcanvas` is set when the drawer opens (see freeze-body-scrolling).
  const focusSearchInputWhenOpen = (): void => {
    if (document.body.getAttribute('data-offcanvas') !== 'search') {
      disableKeyboardNavRing()
      return
    }

    disableKeyboardNavRing()

    requestAnimationFrame(() => {
      searchInput.focus({ preventScroll: true })
      syncSearchMirror()
    })
  }

  namespace.addDocumentEventListener('keydown', (evt) => {
    if (evt instanceof KeyboardEvent && evt.key === 'Tab') {
      enableKeyboardNavRing()
    }
  })

  namespace.addDocumentEventListener('mousedown', () => {
    disableKeyboardNavRing()
  })

  const drawerOpenObserver = new MutationObserver(focusSearchInputWhenOpen)
  drawerOpenObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-offcanvas']
  })

  namespace.addDelegatedEventListener(
    section,
    '.js-clear-search',
    'click',
    (_, evt) => {
      evt.preventDefault()
      resetSearch()
    }
  )

  return {
    unload: () => {
      drawerOpenObserver.disconnect()
      namespace.destroy()
      searchInput.removeEventListener('input', onSearchInput)
      searchDrawerForm.removeEventListener('submit', onDrawerSearchSubmit)
    }
  }
})
