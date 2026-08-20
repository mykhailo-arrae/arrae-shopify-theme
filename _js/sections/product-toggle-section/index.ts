import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'

const TAB_SELECTOR = '.js-product-toggle-tab'
const PANEL_SELECTOR = '.js-product-toggle-panel'
const MEDIA_SELECTOR = '.js-product-toggle-media'

initSection('.js-product-toggle-section', (section) => {
  const tabsOnInit = findElements(section, TAB_SELECTOR)
  if (tabsOnInit.length === 0) {
    return { unload: null }
  }

  const namespace = makeEventNamespace()

  const getTabs = (): HTMLButtonElement[] =>
    findElements(section, TAB_SELECTOR).filter(
      (tab): tab is HTMLButtonElement => tab instanceof HTMLButtonElement
    )

  const getPanels = (): HTMLElement[] => findElements(section, PANEL_SELECTOR)
  const getMediaPanels = (): HTMLElement[] =>
    findElements(section, MEDIA_SELECTOR)

  const activateOption = (option: string, focusTab: boolean): void => {
    const tabs = getTabs()

    tabs.forEach((tab) => {
      const isActive = tab.getAttribute('data-product-toggle-tab') === option
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false')
      tab.setAttribute('tabindex', isActive ? '0' : '-1')
      if (isActive && focusTab) {
        tab.focus()
      }
    })

    getPanels().forEach((panel) => {
      const isActive =
        panel.getAttribute('data-product-toggle-panel') === option
      panel.setAttribute('data-active', isActive ? 'true' : 'false')
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true')
    })

    getMediaPanels().forEach((panel) => {
      const isActive =
        panel.getAttribute('data-product-toggle-panel') === option
      panel.setAttribute('data-active', isActive ? 'true' : 'false')
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true')
    })
  }

  const activateFromTab = (tab: HTMLElement, focusTab = false): void => {
    const option = tab.getAttribute('data-product-toggle-tab')
    if (option == null || option.length === 0) {
      return
    }
    activateOption(option, focusTab)
  }

  namespace.addDelegatedEventListener(section, TAB_SELECTOR, 'click', (tab) => {
    activateFromTab(tab)
  })

  namespace.addDelegatedEventListener(
    section,
    TAB_SELECTOR,
    'keydown',
    (tab, event) => {
      if (!(event instanceof KeyboardEvent)) {
        return
      }

      if (!(tab instanceof HTMLButtonElement)) {
        return
      }

      const tabs = getTabs()
      const currentIndex = tabs.indexOf(tab)
      if (currentIndex === -1 || tabs.length === 0) {
        return
      }

      let nextIndex = currentIndex
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (currentIndex + 1) % tabs.length
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
          break
        case 'Home':
          nextIndex = 0
          break
        case 'End':
          nextIndex = tabs.length - 1
          break
        default:
          return
      }

      event.preventDefault()
      const nextTab = tabs[nextIndex]
      if (nextTab == null) {
        return
      }
      activateFromTab(nextTab, true)
    }
  )

  const selectedTab = findOneElement(
    section,
    `${TAB_SELECTOR}[aria-selected="true"]`
  )
  if (selectedTab != null) {
    activateFromTab(selectedTab)
  }

  return {
    unload: () => {
      namespace.destroy()
    }
  }
})
