import { trapFocus } from '../../core/accessibility/trap-focus.js'
import { initCart } from '../../core/cart-v2/index.js'
import { makeEventNamespace } from '../../core/dom/events/index.js'
import { isHTMLElement } from '../../core/dom/guards.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initMainBus } from '../../core/messaging/main/index.js'
import { freeze, thaw } from './freeze-body-scrolling.js'
import { DrawerName, initOffcanvasMachine } from './machine.js'

/**
 * @description Activate offcanvas drawers
 */
export const init = async (): Promise<void> => {
  const cart = initCart()
  const namespace = makeEventNamespace()
  const mainBus = initMainBus()
  const machine = initOffcanvasMachine()
  const allDrawers = findElements(document, '.js-offcanvas')

  let lastFocusedElement = isHTMLElement(document.activeElement)
    ? document.activeElement
    : null

  if (allDrawers.length === 0) {
    return
  }

  machine.subscribe(function toggleDrawer({
    value: state,
    context: { drawerName }
  }) {
    const attrFilter = `[data-drawer-names~='${drawerName}']`
    const currentDrawer = allDrawers.find((drawer) =>
      drawer.matches(attrFilter)
    )

    const notCurrentDrawers = allDrawers.filter(
      (drawer) => !drawer.matches(attrFilter)
    )

    if (state === 'collapsed') {
      allDrawers.forEach((drawer) => {
        drawer.classList.remove('is-expanded')
        drawer.setAttribute('aria-hidden', 'true')
        drawer.setAttribute('inert', '')
        drawer.tabIndex = -1
      })

      thaw('has-open-offcanvas')

      allDrawers.forEach((drawer) => {
        const content = findOneElement(drawer, '.js-offcanvas-content')

        if (!isHTMLElement(content)) {
          return
        }

        content.scrollTop = 0
      })

      trapFocus(currentDrawer, lastFocusedElement)

      return
    }

    const isCartPage = window.location.pathname === '/cart'
    if (isCartPage && drawerName === 'cart') {
      return
    }

    if (!currentDrawer) {
      return
    }

    const wasAlreadyExpanded = currentDrawer.classList.contains('is-expanded')

    // Body should be frozen before toggling drawer classes
    freeze('has-open-offcanvas', drawerName)

    notCurrentDrawers.forEach((drawer) => {
      drawer.classList.remove('is-expanded')
      drawer.setAttribute('aria-hidden', 'true')
      drawer.setAttribute('inert', '')
      drawer.tabIndex = -1
    })

    currentDrawer.classList.add('is-expanded')
    currentDrawer.removeAttribute('inert')
    currentDrawer.setAttribute('aria-hidden', 'false')
    currentDrawer.tabIndex = 0

    // Capture the last focused element before moving focus into the drawer
    lastFocusedElement = isHTMLElement(document.activeElement)
      ? document.activeElement
      : null

    if (drawerName === 'cart') {
      cart.send({ type: 'RefreshCart', payload: null })
    }

    // Re-expanding an already-open drawer (e.g. SMP sibling swap in quickshop)
    // must not re-trap focus — that scrolls the panel back to the top.
    if (!wasAlreadyExpanded) {
      trapFocus(currentDrawer)
    }
  })

  machine.start()

  namespace.addDelegatedEventListener(
    document,
    '.js-offcanvas-bg',
    'click',
    () => {
      machine.send({ type: 'collapse' })
    }
  )

  // Close drawer on Escape key press (accessibility requirement for modal dialogs)
  namespace.addDocumentEventListener('keydown', (evt) => {
    if (evt instanceof KeyboardEvent && evt.key === 'Escape') {
      machine.send({ type: 'collapse' })
    }
  })

  namespace.addDelegatedEventListener(
    document,
    '.js-offcanvas-close',
    'click',
    () => {
      machine.send({ type: 'collapse' })
    }
  )

  namespace.addDelegatedEventListener(
    document,
    '.js-offcanvas-trigger',
    'click',
    (target, evt) => {
      evt.preventDefault()

      const drawerName = target.getAttribute('data-drawer-name') || ''

      if (DrawerName.is(drawerName)) {
        machine.send({ drawerName, type: 'expand' })
      }
    }
  )

  mainBus.on('request:open-cart-drawer').do(() => {
    machine.send({ type: 'expand', drawerName: 'cart' })
  })

  mainBus.on('request:open-quickshop-drawer').do(() => {
    machine.send({ type: 'expand', drawerName: 'quickshop' })
  })
}
