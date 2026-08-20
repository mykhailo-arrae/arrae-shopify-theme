import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'
import {
  type CollectionResultsRefresh,
  setupCollectionResultsRefresh
} from '../../project/collections/collection-results-refresh.js'
import {
  getCollectionViewPreferences,
  saveCollectionViewPreferences
} from '../../project/collections/collection-view-preferences.js'

type State = {
  gridLayout: '1-column' | '2-column'
}

const GRID_SELECTOR = '.js-collection-grid'
const VIEW_SWITCH_SELECTOR = '.js-collection-view'
const WIDGET_VIEW_BUTTON_SELECTOR = '.js-collection-view button'

initSection('.js-collection-section', (section) => {
  const namespace = makeEventNamespace()

  // Load saved preferences from localStorage
  const savedPreferences = getCollectionViewPreferences()

  const state: State = {
    gridLayout: savedPreferences.gridLayout
  }

  // Update view toggle buttons' aria-pressed for accessibility
  const updateViewButtonsAriaPressed = () => {
    const widgetViewParent = findOneElement(section, VIEW_SWITCH_SELECTOR)
    if (!widgetViewParent) {
      return
    }
    const buttons = findElements(widgetViewParent, 'button[data-view]')

    buttons.forEach((btn) => {
      const view = btn.getAttribute('data-view')
      btn.setAttribute(
        'aria-pressed',
        view === state.gridLayout ? 'true' : 'false'
      )
    })
  }

  // Apply saved preferences to DOM. The grid is re-queried each call because it
  // is replaced when filters or sort refresh the results region.
  const applyViewPreferences = () => {
    const grid = findOneElement(section, GRID_SELECTOR)
    if (!grid) {
      return
    }

    const widgetViewParent = findOneElement(section, VIEW_SWITCH_SELECTOR)
    if (widgetViewParent) {
      widgetViewParent.setAttribute('data-grid-view', state.gridLayout)
    }
    grid.setAttribute('data-layout', state.gridLayout)
    updateViewButtonsAriaPressed()
  }

  // Apply preferences on initial load
  applyViewPreferences()

  /****** View switch ******/

  // Registered before the results refresh so a failure there cannot leave the
  // view toggle without its click handler.
  // Change the grid view layout (1 or 2 columns).
  namespace.addDelegatedEventListener(
    section,
    WIDGET_VIEW_BUTTON_SELECTOR,
    'click',
    (button) => {
      const grid = findOneElement(section, GRID_SELECTOR)
      if (!grid) {
        return
      }

      const view = button.getAttribute('data-view')
      if (view === '1-column') {
        state.gridLayout = '1-column'
      } else {
        state.gridLayout = '2-column'
      }

      grid.setAttribute('data-layout', state.gridLayout)
      const widgetViewParent = findOneElement(section, VIEW_SWITCH_SELECTOR)
      if (widgetViewParent) {
        widgetViewParent.setAttribute('data-grid-view', state.gridLayout)
      }
      updateViewButtonsAriaPressed()

      // Save to localStorage
      saveCollectionViewPreferences({
        gridLayout: state.gridLayout
      })
    }
  )

  /****** Filter/sort results refresh ******/

  let resultsRefresh: CollectionResultsRefresh | null = null
  try {
    resultsRefresh = setupCollectionResultsRefresh({
      section,
      onContentReplaced: applyViewPreferences
    })
  } catch (err) {
    console.error('collection: failed to set up results refresh', err)
  }

  return {
    unload: () => {
      namespace.destroy()
      resultsRefresh?.destroy()
    }
  }
})
