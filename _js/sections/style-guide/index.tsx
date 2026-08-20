import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'

type State = {
  activeSection: string | false
}

type Dom = {
  $links: HTMLElement[]
  $sections: HTMLElement[]
}

const LINK_SELECTOR = '.js-section-link'
const SECTION_SELECTOR = '.js-section'
const DRAWER_TRIGGER = '.js-drawer-trigger'
const DRAWER = '.js-drawer'
const DRAWER_CONTENT = '.js-drawer-content'

initSection('.js-styleguide', (styleguide) => {
  const namespace = makeEventNamespace()
  const dom: Dom = {
    $links: Array.from(findElements(styleguide, LINK_SELECTOR)),
    $sections: Array.from(findElements(styleguide, SECTION_SELECTOR))
  }

  if (dom.$links.length === 0 || dom.$sections.length === 0) {
    return {
      unload: () => {
        namespace.destroy()
      }
    }
  }

  const state: State = {
    activeSection: window.location.hash.substring(1) || false
  }

  const setState = (id: string) => {
    state.activeSection = id
  }

  const setActiveSection = () => {
    dom.$sections.forEach((section) => {
      section.classList.remove('is-active')
    })
    const activeSection = dom.$sections.find((section) => {
      return section.id === state.activeSection
    })
    if (activeSection) {
      activeSection.classList.add('is-active')
    }
  }

  const setActiveLink = () => {
    dom.$links.forEach((link) => {
      link.classList.remove('is-active')
    })
    const activeLink = dom.$links.find((link) => {
      return state.activeSection
        ? link.getAttribute('href') === `#${state.activeSection}`
        : false
    })
    if (activeLink) {
      activeLink.classList.add('is-active')
    }
  }

  const updateState = () => {
    if (state.activeSection) {
      window.location.hash = state.activeSection
      setActiveSection()
      setActiveLink()
    }
  }

  const setInitialState = () => {
    if (state.activeSection) {
      setState(state.activeSection)
      updateState()
    } else {
      const activeSection = dom.$sections.find((section) =>
        section.classList.contains('is-active')
      )
      if (activeSection) {
        state.activeSection = activeSection.id
        window.location.hash = state.activeSection
      }
    }
  }

  const drawer = findOneElement(styleguide, DRAWER)
  const content = styleguide.querySelector(DRAWER_CONTENT)
  const focusableLinks = drawer?.querySelectorAll('.js-section-link')
  focusableLinks?.forEach((link) => {
    link.setAttribute('tabindex', '-1')
  })

  namespace.addDelegatedEventListener(
    styleguide,
    DRAWER_TRIGGER,
    'click',
    (trigger) => {
      if (!drawer || !content) {
        return
      }

      const isExpanded = drawer.classList.toggle('is-expanded')
      drawer.setAttribute('aria-hidden', String(!isExpanded))
      trigger.setAttribute('aria-expanded', String(isExpanded))

      if (isExpanded && content instanceof HTMLElement) {
        focusableLinks?.forEach((link) => {
          link.setAttribute('tabindex', '0')
        })
        content.focus()
      } else {
        focusableLinks?.forEach((link) => {
          link.setAttribute('tabindex', '-1')
        })
        trigger.focus()
      }
    }
  )

  const handleClick = (link: HTMLElement, event: Event) => {
    const id = link.getAttribute('href')?.substring(1)
    event.preventDefault()

    if (!id || state.activeSection === id) {
      return
    }

    if (state.activeSection && state.activeSection !== id) {
      setState(id)
      updateState()
      drawer?.classList.remove('is-expanded')
      drawer?.setAttribute('aria-hidden', 'true')
      focusableLinks?.forEach((focusedLink) => {
        focusedLink.setAttribute('tabindex', '-1')
      })
      drawer?.classList.remove('is-expanded')
      drawer?.setAttribute('aria-hidden', 'true')
      focusableLinks?.forEach((focusedLink) => {
        focusedLink.setAttribute('tabindex', '-1')
      })
    }
  }

  namespace.addDelegatedEventListener(
    styleguide,
    LINK_SELECTOR,
    'click',
    handleClick
  )

  setInitialState()

  // Password input
  namespace.addDelegatedEventListener(
    styleguide,
    '.js-password-toggle',
    'click',
    (toggle) => {
      const passwordField = findOneElement(toggle.parentElement, 'input')
      if (passwordField instanceof HTMLInputElement) {
        if (passwordField.type === 'password') {
          passwordField.type = 'text'
        } else {
          passwordField.type = 'password'
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
