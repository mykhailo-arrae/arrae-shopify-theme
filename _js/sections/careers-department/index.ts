import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'

const SECTION_SELECTOR = '.js-careers-department-section'
const TRIGGER_SELECTOR = '.js-careers-department-trigger'
const PANEL_SELECTOR = '.js-careers-department-panel'

initSection(SECTION_SELECTOR, (section) => {
  const namespace = makeEventNamespace()
  const panel = findOneElement(section, PANEL_SELECTOR)

  const closeAllOtherPanels = () => {
    findElements(document, SECTION_SELECTOR).forEach((otherSection) => {
      if (otherSection === section) {
        return
      }

      const otherTrigger = findOneElement(otherSection, TRIGGER_SELECTOR)
      const otherPanel = findOneElement(otherSection, PANEL_SELECTOR)

      otherTrigger?.setAttribute('aria-expanded', 'false')
      otherPanel?.setAttribute('hidden', '')
    })
  }

  const togglePanel = (trigger: HTMLButtonElement) => {
    if (!panel) {
      return
    }

    const isExpanded = trigger.getAttribute('aria-expanded') === 'true'
    const shouldOpen = !isExpanded

    if (shouldOpen) {
      closeAllOtherPanels()
    }

    trigger.setAttribute('aria-expanded', shouldOpen.toString())

    if (shouldOpen) {
      panel.removeAttribute('hidden')
    } else {
      panel.setAttribute('hidden', '')
    }
  }

  namespace.addDelegatedEventListener(
    section,
    TRIGGER_SELECTOR,
    'click',
    (target) => {
      if (target instanceof HTMLButtonElement) {
        togglePanel(target)
      }
    }
  )

  return {
    unload: () => {
      namespace.destroy()
    }
  }
})
