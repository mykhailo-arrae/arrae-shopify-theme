import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'

const TRIGGER_SELECTOR = '.js-product-accordion-trigger'
const PANEL_SELECTOR = '.js-product-accordion-panel'

initSnippet('product-accordion', (snippet) => {
  const namespace = makeEventNamespace()

  const getTriggers = (): HTMLButtonElement[] =>
    findElements(snippet, TRIGGER_SELECTOR).filter(
      (el): el is HTMLButtonElement => el instanceof HTMLButtonElement
    )

  const getPanels = (): HTMLElement[] => findElements(snippet, PANEL_SELECTOR)

  const closeAllPanels = (): void => {
    getTriggers().forEach((trigger) => {
      trigger.setAttribute('aria-expanded', 'false')
    })
    getPanels().forEach((panel) => {
      panel.setAttribute('hidden', '')
    })
  }

  const togglePanel = (trigger: HTMLButtonElement): void => {
    const panelIndex = trigger.dataset.productAccordionTrigger
    if (!panelIndex) {
      return
    }

    const panel = findOneElement(
      snippet,
      `[data-product-accordion-panel="${panelIndex}"]`
    )
    if (!panel) {
      return
    }

    const isExpanded = trigger.getAttribute('aria-expanded') === 'true'
    const shouldOpen = !isExpanded

    if (shouldOpen) {
      closeAllPanels()
    }

    trigger.setAttribute('aria-expanded', shouldOpen.toString())

    if (shouldOpen) {
      panel.removeAttribute('hidden')
    } else {
      panel.setAttribute('hidden', '')
    }
  }

  const focusTriggerAt = (index: number): void => {
    const triggers = getTriggers()
    if (triggers.length === 0) {
      return
    }

    const normalizedIndex = (index + triggers.length) % triggers.length
    triggers[normalizedIndex]?.focus()
  }

  namespace.addDelegatedEventListener(
    snippet,
    TRIGGER_SELECTOR,
    'click',
    (target) => {
      if (target instanceof HTMLButtonElement) {
        togglePanel(target)
      }
    }
  )

  namespace.addDelegatedEventListener(
    snippet,
    TRIGGER_SELECTOR,
    'keydown',
    (target, event) => {
      if (!(target instanceof HTMLButtonElement)) {
        return
      }

      if (!(event instanceof KeyboardEvent)) {
        return
      }

      const triggers = getTriggers()
      const currentIndex = triggers.indexOf(target)

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          focusTriggerAt(currentIndex + 1)
          break
        case 'ArrowUp':
          event.preventDefault()
          focusTriggerAt(currentIndex - 1)
          break
        case 'Home':
          event.preventDefault()
          focusTriggerAt(0)
          break
        case 'End':
          event.preventDefault()
          focusTriggerAt(triggers.length - 1)
          break
      }
    }
  )

  return () => {
    namespace.destroy()
  }
})
