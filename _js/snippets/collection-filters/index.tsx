import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'

/**
 * Dispatched on `document` when the combined Filter & Sort drawer wants the
 * collection results updated in place. `collection-results-refresh.ts` listens
 * and applies the params via the Section Rendering API. Only fired when the
 * drawer is on the collection page (live updates); search falls back to a full
 * page navigation.
 */
export const COLLECTION_FILTERS_APPLY_EVENT = 'collection:filters-apply'

const APPLY_DEBOUNCE_MS = 350

initSnippet('collection-filters', (snippet) => {
  const namespace = makeEventNamespace()
  const form = findOneElement(snippet, '#js-filters-form')

  if (!(form instanceof HTMLFormElement)) {
    console.error('collection-filters: form not found')
    return
  }

  const isAjax = form.getAttribute('data-collection-ajax') === 'true'
  const resetButton = findOneElement(snippet, '.js-reset-filters')
  const submitButton = findOneElement(snippet, '.js-submit-filters')

  const getCheckboxes = (): HTMLInputElement[] =>
    findElements(form, '.js-collection-filter').filter(
      (el): el is HTMLInputElement =>
        el instanceof HTMLInputElement && el.type === 'checkbox'
    )

  const getPriceInputs = (): HTMLInputElement[] =>
    findElements(form, 'input[type="number"][name^="filter."]').filter(
      (el): el is HTMLInputElement => el instanceof HTMLInputElement
    )

  const getSelectedSort = (): string | null => {
    const selected = findOneElement(form, '.js-collection-sort:checked')
    return selected instanceof HTMLInputElement ? selected.value : null
  }

  // Collection/search default sort from Liquid.
  const defaultSortBy = form.getAttribute('data-default-sort-by')

  /** Sort currently applied via the URL; missing `sort_by` means the default. */
  const getAppliedSort = (): string | null => {
    if (defaultSortBy == null) {
      return null
    }
    const fromUrl = new URLSearchParams(window.location.search).get('sort_by')
    if (fromUrl == null || fromUrl === '') {
      return defaultSortBy
    }
    return fromUrl
  }

  const hasActiveFilters = (): boolean =>
    getCheckboxes().some((cb) => cb.checked) ||
    getPriceInputs().some((input) => input.value.trim() !== '')

  /** Filters currently applied via the URL (still need clearing via submit on search). */
  const hasAppliedFilters = (): boolean => {
    const params = new URLSearchParams(window.location.search)
    for (const key of params.keys()) {
      if (key.startsWith('filter.')) {
        return true
      }
    }
    return false
  }

  // True when the selected or URL-applied sort is not the default. Checking both
  // keeps submit enabled after applying a non-default sort, and still enabled
  // while reverting from a non-default applied sort back to the default.
  const hasNonDefaultSort = (): boolean => {
    if (defaultSortBy == null) {
      return false
    }
    const selected = getSelectedSort()
    const applied = getAppliedSort()
    return (
      (selected != null && selected !== defaultSortBy) ||
      (applied != null && applied !== defaultSortBy)
    )
  }

  // Clear is always visible; it's disabled when there is nothing to clear.
  const updateResetState = (): void => {
    if (resetButton == null) {
      return
    }
    if (hasActiveFilters()) {
      resetButton.removeAttribute('disabled')
    } else {
      resetButton.setAttribute('disabled', '')
    }
  }

  // Submit stays enabled while the form has selections, or while URL-applied
  // filters/sort still need to be navigated away (search has no live apply).
  const updateSubmitState = (): void => {
    if (submitButton == null) {
      return
    }
    if (hasActiveFilters() || hasAppliedFilters() || hasNonDefaultSort()) {
      submitButton.removeAttribute('disabled')
    } else {
      submitButton.setAttribute('disabled', '')
    }
  }

  const formatClearCount = (count: number): string =>
    `(${count.toString().padStart(2, '0')})`

  // Mirror the applied filter count onto the section trigger ("Filter & Sort")
  // badge and the footer "Clear (NN)" label so both reflect live changes
  // without a server round-trip.
  const updateTriggerCount = (): void => {
    const count =
      getCheckboxes().filter((cb) => cb.checked).length +
      getPriceInputs().filter((input) => input.value.trim() !== '').length

    findElements(document, '.js-collection-filter-count').forEach((badge) => {
      badge.textContent = count > 0 ? count.toString() : ''
      badge.classList.toggle('hidden', count === 0)
    })

    findElements(form, '.js-filter-clear-count').forEach((label) => {
      label.textContent = formatClearCount(count)
    })
  }

  /** Builds the `filter.*` + `sort_by` query string from the current form. */
  const buildSearch = (): string => {
    const params = new URLSearchParams()
    new FormData(form).forEach((value, key) => {
      if (typeof value !== 'string') {
        return
      }
      if (key === 'sort_by') {
        if (value) {
          params.set('sort_by', value)
        }
      } else if (key.startsWith('filter.') && value.trim() !== '') {
        params.append(key, value)
      }
    })
    return params.toString()
  }

  const applyViaAjax = (): void => {
    document.dispatchEvent(
      new CustomEvent(COLLECTION_FILTERS_APPLY_EVENT, {
        detail: { search: buildSearch() }
      })
    )
  }

  // Search and other non-collection contexts navigate, preserving unrelated params (e.g. `q`).
  const applyViaNavigation = (): void => {
    const url = new URL(window.location.href)
    Array.from(url.searchParams.keys()).forEach((key) => {
      if (key.startsWith('filter.') || key === 'sort_by' || key === 'page') {
        url.searchParams.delete(key)
      }
    })
    new URLSearchParams(buildSearch()).forEach((value, key) => {
      url.searchParams.append(key, value)
    })
    window.location.href = url.toString()
  }

  let applyTimer: ReturnType<typeof setTimeout> | null = null

  const cancelPendingApply = (): void => {
    if (applyTimer != null) {
      clearTimeout(applyTimer)
      applyTimer = null
    }
  }

  const scheduleApply = (): void => {
    if (!isAjax) {
      return
    }
    cancelPendingApply()
    applyTimer = setTimeout(() => {
      applyTimer = null
      applyViaAjax()
    }, APPLY_DEBOUNCE_MS)
  }

  // Toggling a pill or changing the sort updates the badge/reset state and, on
  // the collection page, schedules a live results update. Visual selected state is driven
  // purely by `:checked` in CSS, so no class juggling is needed here.
  namespace.addDelegatedEventListener(
    form,
    '.js-collection-filter, .js-collection-sort',
    'change',
    () => {
      updateResetState()
      updateSubmitState()
      updateTriggerCount()
      scheduleApply()
    }
  )

  // Live-validate price inputs as the user types.
  namespace.addDelegatedEventListener(
    form,
    'input[type="number"][name^="filter."]',
    'input',
    () => {
      updateResetState()
      updateSubmitState()
      updateTriggerCount()
      scheduleApply()
    }
  )

  // "Clear all" — unselect everything. Applies immediately on the collection page.
  if (resetButton) {
    namespace.addDirectEventListener(resetButton, 'click', () => {
      getCheckboxes().forEach((checkbox) => {
        checkbox.checked = false
      })
      getPriceInputs().forEach((input) => {
        input.value = ''
      })
      updateResetState()
      updateSubmitState()
      updateTriggerCount()
      if (isAjax) {
        cancelPendingApply()
        applyViaAjax()
      }
    })
  }

  // "View Results": on the collection page changes are already applied live, so
  // the button only closes the drawer (handled globally by `.js-offcanvas-close`). Other contexts
  // navigate to the filtered URL.
  if (submitButton) {
    namespace.addDirectEventListener(submitButton, 'click', () => {
      if (isAjax) {
        // Flush any debounced change so results match the selection on close.
        if (applyTimer != null) {
          cancelPendingApply()
          applyViaAjax()
        }
      } else {
        applyViaNavigation()
      }
    })
  }

  updateResetState()
  updateSubmitState()
  updateTriggerCount()

  return () => {
    cancelPendingApply()
    namespace.destroy()
  }
})
