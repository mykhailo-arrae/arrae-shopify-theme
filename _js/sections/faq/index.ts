import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'

const TAB_SELECTOR = '.js-faq-tab'
const PANEL_SELECTOR = '.js-faq-panel'
const TRIGGER_SELECTOR = '.js-faq-accordion-trigger'
const ACCORDION_PANEL_SELECTOR = '.js-faq-accordion-panel'

initSection('.js-faq-section', (section) => {
  const namespace = makeEventNamespace()

  const tabButtons = findElements(section, TAB_SELECTOR)
  const categoryPanels = findElements(section, PANEL_SELECTOR)

  const getTriggersForPanel = (panel: HTMLElement): HTMLButtonElement[] =>
    findElements(panel, TRIGGER_SELECTOR).filter(
      (element): element is HTMLButtonElement =>
        element instanceof HTMLButtonElement
    )

  const getAccordionPanelsForPanel = (panel: HTMLElement): HTMLElement[] =>
    findElements(panel, ACCORDION_PANEL_SELECTOR)

  const resetPanelAccordion = (panel: HTMLElement): void => {
    const triggers = getTriggersForPanel(panel)
    const accordionPanels = getAccordionPanelsForPanel(panel)

    triggers.forEach((trigger, index) => {
      const isFirst = index === 0
      trigger.setAttribute('aria-expanded', isFirst ? 'true' : 'false')
    })

    accordionPanels.forEach((accordionPanel, index) => {
      if (index === 0) {
        accordionPanel.removeAttribute('hidden')
      } else {
        accordionPanel.setAttribute('hidden', '')
      }
    })
  }

  const closeAllAccordionPanelsInPanel = (panel: HTMLElement): void => {
    getTriggersForPanel(panel).forEach((trigger) => {
      trigger.setAttribute('aria-expanded', 'false')
    })
    getAccordionPanelsForPanel(panel).forEach((accordionPanel) => {
      accordionPanel.setAttribute('hidden', '')
    })
  }

  const toggleAccordionPanel = (
    panel: HTMLElement,
    trigger: HTMLButtonElement
  ): void => {
    const panelIndex = trigger.dataset.faqAccordionTrigger
    if (!panelIndex) {
      return
    }

    const accordionPanel = findOneElement(
      panel,
      `[data-faq-accordion-panel="${panelIndex}"]`
    )
    if (!accordionPanel) {
      return
    }

    const isExpanded = trigger.getAttribute('aria-expanded') === 'true'
    const shouldOpen = !isExpanded

    if (shouldOpen) {
      closeAllAccordionPanelsInPanel(panel)
    }

    trigger.setAttribute('aria-expanded', shouldOpen.toString())

    if (shouldOpen) {
      accordionPanel.removeAttribute('hidden')
    } else {
      accordionPanel.setAttribute('hidden', '')
    }
  }

  const activateCategory = (categoryId: string): void => {
    tabButtons.forEach((tab) => {
      const isActive = tab.dataset.faqTab === categoryId
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false')
    })

    categoryPanels.forEach((panel) => {
      const isActive = panel.dataset.faqPanel === categoryId
      if (isActive) {
        panel.removeAttribute('hidden')
        resetPanelAccordion(panel)
      } else {
        panel.setAttribute('hidden', '')
      }
    })
  }

  if (tabButtons.length > 0 && categoryPanels.length > 0) {
    namespace.addDelegatedEventListener(
      section,
      TAB_SELECTOR,
      'click',
      (target) => {
        if (!(target instanceof HTMLButtonElement)) {
          return
        }

        const categoryId = target.dataset.faqTab
        if (!categoryId) {
          return
        }

        activateCategory(categoryId)
      }
    )
  }

  namespace.addDelegatedEventListener(
    section,
    TRIGGER_SELECTOR,
    'click',
    (target) => {
      if (!(target instanceof HTMLButtonElement)) {
        return
      }

      const panel = target.closest(PANEL_SELECTOR)
      if (!(panel instanceof HTMLElement)) {
        return
      }

      toggleAccordionPanel(panel, target)
    }
  )

  namespace.addDelegatedEventListener(
    section,
    TRIGGER_SELECTOR,
    'keydown',
    (target, event) => {
      if (!(target instanceof HTMLButtonElement)) {
        return
      }

      if (!(event instanceof KeyboardEvent)) {
        return
      }

      const panel = target.closest(PANEL_SELECTOR)
      if (!(panel instanceof HTMLElement)) {
        return
      }

      const triggers = getTriggersForPanel(panel)
      const currentIndex = triggers.indexOf(target)

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          const nextIndex = (currentIndex + 1) % triggers.length
          triggers[nextIndex]?.focus()
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          const previousIndex =
            currentIndex - 1 < 0 ? triggers.length - 1 : currentIndex - 1
          triggers[previousIndex]?.focus()
          break
        }
        case 'Home': {
          event.preventDefault()
          triggers[0]?.focus()
          break
        }
        case 'End': {
          event.preventDefault()
          triggers[triggers.length - 1]?.focus()
          break
        }
      }
    }
  )

  return {
    unload: () => {
      namespace.destroy()
    }
  }
})
