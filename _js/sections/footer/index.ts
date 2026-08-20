import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'

initSection('.js-footer', (section) => {
  const namespace = makeEventNamespace()

  // Acordions
  const closeActiveAccordions = () => {
    const activeTitle = findOneElement(section, '.js-accordion-trigger.active')
    const activeContent = findOneElement(
      section,
      '.js-accordion-content.active'
    )

    if (activeTitle && activeContent) {
      activeTitle.classList.remove('active')
      activeTitle.setAttribute('aria-expanded', 'false')
      activeContent.classList.remove('active')
      activeContent.setAttribute('aria-expanded', 'false')
    }
  }

  const closeAccordion = (trigger: HTMLElement) => {
    trigger.classList.remove('active')
    trigger.setAttribute('aria-expanded', 'false')
    const accordion = trigger.parentElement
    if (!accordion) {
      return null
    }
    const content = findOneElement(accordion, '.js-accordion-content')
    content?.classList.remove('active')
  }

  namespace.addDelegatedEventListener(
    section,
    '.js-accordion-trigger',
    'click',
    (accordion, evt) => {
      evt.preventDefault()

      if (accordion.classList.contains('active')) {
        closeAccordion(accordion)
      } else {
        closeActiveAccordions()

        const container = accordion.parentElement

        if (!container) {
          return null
        }

        const content = findOneElement(container, '.js-accordion-content')

        accordion.setAttribute('aria-expanded', 'true')
        accordion.classList.add('active')
        content?.classList.add('active')
      }
    }
  )

  return {
    unload: () => {
      namespace.destroy()
    }
  }
})
