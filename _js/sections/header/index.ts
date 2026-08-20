import { createFocusTrap, type FocusTrap } from 'focus-trap'
import { prefersReducedMotion } from '../../core/accessibility/prefers-reduced-motion.js'
import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'
import {
  freeze,
  thaw
} from '../../theme/offcanvas-drawers/freeze-body-scrolling.js'

type WindowWithShopify = Window & {
  Shopify?: { designMode?: boolean }
}
declare let window: WindowWithShopify

const SCROLL_THRESHOLD = 64
const MEGAMENU_CLOSE_DELAY = 180
const MEGAMENU_LOCK_CLASS = 'has-open-megamenu'
const MOBILE_DRAWER_LOCK_CLASS = 'has-open-mobile-drawer'
const DESKTOP_BREAKPOINT_QUERY = '(min-width: 64em)'
const PAGE_REGION_SELECTORS = ['#main-content', 'footer'] as const

const isDesignMode = (): boolean => window.Shopify?.designMode === true

// True when the nav is the drawer (viewport < 64em, or drawer-on-desktop).
// Mega menu hover handlers skip in that case. Not cached so resize updates apply.
const isMobileViewport = (): boolean => {
  if (
    document.querySelector(
      '.js-mobile-drawer[data-drawer-mode-on-desktop="true"]'
    ) != null
  ) {
    return true
  }

  return window.matchMedia('(width < 64em)').matches
}

// Mega menu body-scroll lock. Reuses the shared `freeze`/`thaw` helper but
// with its own marker class so a drawer opening (or closing) doesn't
// accidentally tear down the megamenu's lock — and vice versa. Note that
// `freeze` is invoked WITHOUT an offcanvasName so `data-offcanvas` is not
// touched, which would otherwise trip the mutation observer below.
const lockBodyForMegamenu = (): void => {
  if (document.body.classList.contains(MEGAMENU_LOCK_CLASS)) {
    return
  }
  freeze(MEGAMENU_LOCK_CLASS)
}

const unlockBodyForMegamenu = (): void => {
  if (!document.body.classList.contains(MEGAMENU_LOCK_CLASS)) {
    return
  }
  thaw(MEGAMENU_LOCK_CLASS)
}
/**
 * While the body is frozen (offcanvas drawer OR open mega menu), the body
 * is `position: fixed` with `top` set to the negative pre-lock scroll
 * offset (see freeze-body-scrolling). `window.scrollY` then reads ~0, so
 * we recover the real position from `body.style.top`. Without this, the
 * scroll handler would flip `data-scrolled='false'` the moment the body
 * locks — reopening the announcement-bar offset under the header and
 * leaving a visible gap above the mega menu panel.
 */
const scrollYNow = (): number => {
  const body = document.body
  if (body.classList.contains('is-frozen') && body.style.top !== '') {
    const fromFrozenBody = Number.parseInt(body.style.top, 10)
    if (!Number.isNaN(fromFrozenBody)) {
      return Math.max(0, -fromFrozenBody)
    }
  }

  return Math.max(
    0,
    window.scrollY ??
      window.pageYOffset ??
      document.documentElement.scrollTop ??
      document.body.scrollTop ??
      0
  )
}

initSection('.js-header', (section) => {
  // Theme Editor (design mode) gets a relaxed interaction model:
  //   - no hover/scroll-lock, so the merchant can edit freely
  //   - click toggles a panel open/closed (also tap-friendly on touch)
  //   - `shopify:block:select` auto-opens the relevant panel so the
  //     selected child block is actually visible in the preview
  const designMode = isDesignMode()
  if (designMode) {
    section.dataset.designMode = 'true'
  }

  const namespace = makeEventNamespace()
  let lastScrollY = scrollYNow()
  let throttling = false

  // Megamenu state is referenced by the scroll handler below to keep the
  // header pinned while a panel is open.
  let openBlockId: string | null = null
  let closeTimer: ReturnType<typeof setTimeout> | null = null
  let suppressFocusinBlockId: string | null = null
  const pendingCloseListeners = new Map<string, (evt: Event) => void>()

  // Page regions that should become `inert` while a mega menu panel is
  // open. Body scroll is locked at this point (modal-like), so any focus
  // or click that leaks into the page behind the backdrop is an a11y
  // problem; `inert` removes those regions from the focus + a11y tree
  // until the panel closes.
  let inertedRegions: HTMLElement[] = []

  const setPageRegionsInert = (active: boolean): void => {
    if (active) {
      if (inertedRegions.length > 0) {
        return
      }
      PAGE_REGION_SELECTORS.forEach((selector) => {
        document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
          if (el.hasAttribute('inert')) {
            return
          }
          el.setAttribute('inert', '')
          inertedRegions.push(el)
        })
      })
      return
    }
    inertedRegions.forEach((el) => el.removeAttribute('inert'))
    inertedRegions = []
  }

  // Single, reusable focus trap for the mega menu. The trap's containers
  // are updated each time a panel opens (or panels switch) instead of
  // tearing down and rebuilding — this keeps focus management cheap and
  // avoids fighting focus-trap's own focus assertions during transitions.
  let focusTrap: FocusTrap | null = null
  const navMenuList = findOneElement(section, '.js-header-nav')

  const refreshFocusTrap = (panelEl: HTMLElement): void => {
    const containers: HTMLElement[] = []
    if (navMenuList instanceof HTMLElement) {
      containers.push(navMenuList)
    }
    containers.push(panelEl)

    if (focusTrap == null) {
      focusTrap = createFocusTrap(containers, {
        initialFocus: false,
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        allowOutsideClick: true,
        returnFocusOnDeactivate: false,
        // Mega menu panels animate from `hidden` → visible. By the time
        // we activate the trap the panel may still be in its hidden
        // frame, so opt out of focus-trap's display visibility check.
        tabbableOptions: { displayCheck: 'none' }
      })
      try {
        focusTrap.activate()
      } catch {
        // focus-trap throws when there are no tabbable elements yet;
        // we tolerate that since the panel content may still be hydrating.
      }
      return
    }
    focusTrap.updateContainerElements(containers)
  }

  const releaseFocusTrap = (): void => {
    if (focusTrap == null) {
      return
    }
    focusTrap.deactivate()
    focusTrap = null
  }

  // --- Show/hide on scroll ---
  // Skipped entirely in the Theme Editor: the editor frequently scrolls
  // and reflows the preview iframe, and hiding the header on scroll just
  // gets in the way when the merchant is trying to edit it.
  const announcementBarContainer = findOneElement(
    document,
    '.js-announcement-bar-container'
  )

  const handleScroll = (): void => {
    if (document.body.classList.contains('is-frozen')) {
      return
    }

    const y = scrollYNow()
    const reducedMotion = prefersReducedMotion()

    if (y <= 1) {
      if (announcementBarContainer != null) {
        announcementBarContainer.dataset.scrolled = 'false'
      }
      section.dataset.scrolled = 'false'
      section.dataset.hidden = 'false'
      lastScrollY = y
      return
    }

    if (announcementBarContainer != null) {
      announcementBarContainer.dataset.scrolled = 'true'
    }

    section.dataset.scrolled = 'true'

    // Never hide the header while a megamenu OR the mobile drawer is open:
    // closing the panel out from under the user would feel jumpy, and the
    // drawer's anchored chrome would slide off screen with the header.
    // Closing the panel on scroll-down is handled separately below.
    if (openBlockId != null || section.dataset.mobileDrawerOpen === 'true') {
      section.dataset.hidden = 'false'
      lastScrollY = y
      return
    }

    if (reducedMotion) {
      section.dataset.hidden = 'false'
    } else if (y > lastScrollY && y >= SCROLL_THRESHOLD) {
      section.dataset.hidden = 'true'
    } else if (y < lastScrollY) {
      section.dataset.hidden = 'false'
    }

    lastScrollY = y
  }

  const onScrollThrottled = (): void => {
    if (throttling) {
      return
    }
    throttling = true
    requestAnimationFrame(() => {
      handleScroll()
      throttling = false
    })
  }

  if (!designMode) {
    namespace.addDocumentEventListener('scroll', onScrollThrottled, {
      passive: true
    })
  }

  // --- Megamenu ---

  const getTrigger = (blockId: string): HTMLElement | null =>
    findOneElement(section, `.js-megamenu-trigger[data-block-id="${blockId}"]`)

  const getPanel = (blockId: string): HTMLElement | null =>
    findOneElement(section, `#megamenu-panel-${blockId}`)

  // Single source of truth for the open/closed visual state. Driving the
  // dataset attribute here also keeps the backdrop CSS and the body lock
  // in sync — crossfades between two open panels never thrash the lock.
  const setMegamenuOpenState = (isOpen: boolean): void => {
    const wasOpen = section.dataset.megamenuOpen === 'true'
    section.dataset.megamenuOpen = isOpen ? 'true' : 'false'
    if (designMode) {
      return
    }
    if (isOpen && !wasOpen) {
      lockBodyForMegamenu()
      setPageRegionsInert(true)
    } else if (!isOpen && wasOpen) {
      unlockBodyForMegamenu()
      setPageRegionsInert(false)
      releaseFocusTrap()
    }
  }
  const clearPendingCloseListener = (
    panel: HTMLElement,
    blockId: string
  ): void => {
    const existing = pendingCloseListeners.get(blockId)
    if (existing != null) {
      panel.removeEventListener('transitionend', existing)
      pendingCloseListeners.delete(blockId)
    }
  }

  const closePanelImmediate = (blockId: string, instant = false): void => {
    const panel = getPanel(blockId)
    const trigger = getTrigger(blockId)

    if (panel == null) {
      return
    }

    // If the user's focus is currently inside the panel that's about to
    // close, return it to the trigger so they don't end up on an element
    // that's about to be `hidden` (and effectively unfocusable).
    const activeEl = document.activeElement
    const focusInsidePanel =
      activeEl instanceof Node && panel.contains(activeEl)
    if (
      focusInsidePanel &&
      trigger != null &&
      blockId !== suppressFocusinBlockId
    ) {
      suppressFocusinBlockId = blockId
      trigger.focus()
      queueMicrotask(() => {
        if (suppressFocusinBlockId === blockId) {
          suppressFocusinBlockId = null
        }
      })
    }

    panel.setAttribute('aria-hidden', 'true')
    delete panel.dataset.crossfade

    if (trigger != null) {
      trigger.setAttribute('aria-expanded', 'false')
    }

    if (openBlockId === blockId) {
      openBlockId = null
      setMegamenuOpenState(false)
    }

    clearPendingCloseListener(panel, blockId)

    if (instant || prefersReducedMotion()) {
      panel.setAttribute('hidden', '')
      return
    }

    const onTransitionEnd = (evt: Event): void => {
      if (!(evt instanceof TransitionEvent) || evt.propertyName !== 'opacity') {
        return
      }
      if (panel.getAttribute('aria-hidden') === 'true') {
        panel.setAttribute('hidden', '')
      }
      panel.removeEventListener('transitionend', onTransitionEnd)
      pendingCloseListeners.delete(blockId)
    }
    pendingCloseListeners.set(blockId, onTransitionEnd)
    panel.addEventListener('transitionend', onTransitionEnd)
  }

  const scheduleClose = (blockId: string): void => {
    if (closeTimer != null) {
      clearTimeout(closeTimer)
    }
    closeTimer = setTimeout(() => {
      closePanelImmediate(blockId)
      closeTimer = null
    }, MEGAMENU_CLOSE_DELAY)
  }

  const cancelClose = (): void => {
    if (closeTimer != null) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
  }

  const openPanel = (blockId: string): void => {
    const panel = getPanel(blockId)
    const trigger = getTrigger(blockId)

    if (panel == null) {
      return
    }

    const previouslyOpenId = openBlockId
    const isSwitching = previouslyOpenId != null && previouslyOpenId !== blockId

    // Claim the open state BEFORE closing the previously open panel.
    // Otherwise `closePanelImmediate` would see itself as the active panel,
    // call `setMegamenuOpenState(false)` and briefly unlock the body. The
    // thaw/freeze round-trip captures a stale `scrollY` (0 because the body
    // is still fixed) and snaps the page back to the top on the next switch.
    openBlockId = blockId
    setMegamenuOpenState(true)
    // Make sure the header is on screen — otherwise a previous scroll-down
    // could leave `data-hidden='true'` and slide the just-opened panel
    // away with the header until the next scroll event.
    section.dataset.hidden = 'false'

    findElements(section, '.js-megamenu-trigger').forEach((other) => {
      const id = other.dataset.blockId
      if (id != null && id !== blockId) {
        closePanelImmediate(id, true)
      }
    })

    clearPendingCloseListener(panel, blockId)

    if (isSwitching) {
      panel.dataset.crossfade = ''
    } else {
      delete panel.dataset.crossfade
    }

    panel.removeAttribute('hidden')
    // Force reflow so the open transition runs from the hidden state.
    panel.getBoundingClientRect()
    panel.setAttribute('aria-hidden', 'false')

    if (trigger != null) {
      trigger.setAttribute('aria-expanded', 'true')
    }

    if (!designMode) {
      refreshFocusTrap(panel)
    }
  }

  // The "megamenu interaction zone" is the desktop nav (all triggers) plus
  // the currently open panel. While the cursor is anywhere inside this
  // zone — including the empty whitespace between two triggers in the
  // <ul> — we never want to schedule a close, because the user is clearly
  // still navigating between menu items. Only when the cursor leaves the
  // zone entirely (e.g. moves down into the page body) do we start the
  // close timer.
  const megamenuNav = findOneElement(section, '.js-header-nav')

  const isInsideMegamenuZone = (target: EventTarget | null): boolean => {
    if (!(target instanceof Node)) {
      return false
    }
    if (megamenuNav != null && megamenuNav.contains(target)) {
      return true
    }
    if (openBlockId != null) {
      const openPanelEl = getPanel(openBlockId)
      if (openPanelEl != null && openPanelEl.contains(target)) {
        return true
      }
    }
    return false
  }

  if (!designMode) {
    if (megamenuNav != null) {
      namespace.addDirectEventListener(
        megamenuNav,
        'pointerout',
        (_nav, evt) => {
          if (!(evt instanceof PointerEvent)) {
            return
          }
          if (evt.pointerType !== 'mouse' && evt.pointerType !== 'pen') {
            return
          }
          // Mobile viewport runs the drawer/accordion interaction model;
          // hover-based opens/closes don't apply.
          if (isMobileViewport()) {
            return
          }
          if (isInsideMegamenuZone(evt.relatedTarget)) {
            return
          }
          if (openBlockId != null) {
            scheduleClose(openBlockId)
          }
        }
      )
    }

    // pointerenter/pointerleave don't bubble, so we use pointerover/pointerout
    // with relatedTarget checks to replicate enter/leave semantics via delegation.
    namespace.addDelegatedEventListener(
      section,
      '.js-megamenu-trigger',
      'pointerover',
      (trigger, evt) => {
        if (!(evt instanceof PointerEvent)) {
          return
        }
        if (evt.pointerType !== 'mouse' && evt.pointerType !== 'pen') {
          return
        }
        if (isMobileViewport()) {
          return
        }
        if (
          evt.relatedTarget instanceof Node &&
          trigger.contains(evt.relatedTarget)
        ) {
          return
        }
        const blockId = trigger.dataset.blockId
        if (blockId == null) {
          return
        }
        cancelClose()
        openPanel(blockId)
      }
    )

    namespace.addDelegatedEventListener(
      section,
      '.js-megamenu-trigger',
      'pointerout',
      (trigger, evt) => {
        if (!(evt instanceof PointerEvent)) {
          return
        }
        if (evt.pointerType !== 'mouse' && evt.pointerType !== 'pen') {
          return
        }
        if (isMobileViewport()) {
          return
        }
        // Moving to another trigger, the open panel, or just hovering the
        // surrounding nav row counts as staying inside the megamenu — bail
        // out instead of scheduling a close so the panel doesn't flicker.
        if (isInsideMegamenuZone(evt.relatedTarget)) {
          return
        }
        const blockId = trigger.dataset.blockId
        if (blockId == null) {
          return
        }
        scheduleClose(blockId)
      }
    )

    namespace.addDelegatedEventListener(
      section,
      '.js-megamenu-panel',
      'pointerover',
      (panelEl, evt) => {
        if (!(evt instanceof PointerEvent)) {
          return
        }
        if (evt.pointerType !== 'mouse' && evt.pointerType !== 'pen') {
          return
        }
        if (isMobileViewport()) {
          return
        }
        if (
          evt.relatedTarget instanceof Node &&
          panelEl.contains(evt.relatedTarget)
        ) {
          return
        }
        cancelClose()
      }
    )

    namespace.addDelegatedEventListener(
      section,
      '.js-megamenu-panel',
      'pointerout',
      (panelEl, evt) => {
        if (!(evt instanceof PointerEvent)) {
          return
        }
        if (evt.pointerType !== 'mouse' && evt.pointerType !== 'pen') {
          return
        }
        if (isMobileViewport()) {
          return
        }
        // Crossing back into a trigger, another trigger's panel, or the
        // surrounding nav row should NOT close the megamenu — the user is
        // still navigating it.
        if (isInsideMegamenuZone(evt.relatedTarget)) {
          return
        }
        const blockId = panelEl.id.replace('megamenu-panel-', '')
        if (blockId.length > 0) {
          scheduleClose(blockId)
        }
      }
    )

    // Hovering a plain `link` nav item should dismiss any open mega menu.
    namespace.addDelegatedEventListener(
      section,
      '.js-nav-link',
      'pointerover',
      (link, evt) => {
        if (!(evt instanceof PointerEvent)) {
          return
        }
        if (evt.pointerType !== 'mouse' && evt.pointerType !== 'pen') {
          return
        }
        if (isMobileViewport()) {
          return
        }
        if (
          evt.relatedTarget instanceof Node &&
          link.contains(evt.relatedTarget)
        ) {
          return
        }
        if (openBlockId != null) {
          scheduleClose(openBlockId)
        }
      }
    )
  }

  // Click toggle (also handles tap on touch devices and is the primary
  // interaction in the Theme Editor).
  namespace.addDelegatedEventListener(
    section,
    '.js-megamenu-trigger',
    'click',
    (trigger, evt) => {
      const blockId = trigger.dataset.blockId
      if (blockId == null) {
        return
      }

      if (evt instanceof MouseEvent && evt.detail > 0) {
        // Pointer-initiated click: toggle.
        const isOpen = trigger.getAttribute('aria-expanded') === 'true'
        cancelClose()
        if (isOpen) {
          closePanelImmediate(blockId)
        } else {
          openPanel(blockId)
        }
      } else if (blockId !== suppressFocusinBlockId) {
        // Keyboard activation (Enter/Space): always open.
        cancelClose()
        openPanel(blockId)
      }
    }
  )

  // Keyboard: focusin on trigger opens panel when keyboard-navigating.
  namespace.addDelegatedEventListener(
    section,
    '.js-megamenu-trigger',
    'focusin',
    (trigger) => {
      const blockId = trigger.dataset.blockId
      if (blockId == null) {
        return
      }
      if (blockId === suppressFocusinBlockId) {
        return
      }
      if (!trigger.matches(':focus-visible')) {
        return
      }
      cancelClose()
      openPanel(blockId)
    }
  )

  // Escape closes the open panel and returns focus to the trigger.
  namespace.addDocumentEventListener('keydown', (evt) => {
    if (!(evt instanceof KeyboardEvent) || evt.key !== 'Escape') {
      return
    }
    if (openBlockId == null) {
      return
    }
    const openId = openBlockId
    suppressFocusinBlockId = openId
    cancelClose()
    closePanelImmediate(openId)
    getTrigger(openId)?.focus()
    queueMicrotask(() => {
      suppressFocusinBlockId = null
    })
  })

  if (!designMode) {
    namespace.addDocumentEventListener('pointerdown', (evt) => {
      if (!(evt instanceof PointerEvent)) {
        return
      }
      const target = evt.target
      if (!(target instanceof Node)) {
        return
      }
      if (!section.contains(target) && openBlockId != null) {
        cancelClose()
        closePanelImmediate(openBlockId)
      }
    })
  }

  if (!designMode) {
    namespace.addDocumentEventListener('focusin', (evt) => {
      const target = evt.target
      if (!(target instanceof HTMLElement)) {
        return
      }
      if (openBlockId == null) {
        return
      }

      const trigger = getTrigger(openBlockId)
      const panel = getPanel(openBlockId)

      const insideTrigger = trigger != null && trigger.contains(target)
      const insidePanel = panel != null && panel.contains(target)

      if (!insideTrigger && !insidePanel) {
        cancelClose()
        closePanelImmediate(openBlockId)
      }
    })
  }

  // Theme Editor block selection. When a merchant clicks on a child block
  // inside a mega menu panel (e.g. a Quick Link), Shopify dispatches
  // `shopify:block:select` with the block element as the event target.
  // We walk up the DOM to find the parent panel and open it so the
  // selected block is visible in the preview iframe.
  const handleBlockSelect = (evt: Event): void => {
    if (!(evt.target instanceof HTMLElement)) {
      return
    }
    const target = evt.target
    if (!section.contains(target)) {
      return
    }

    // 1. The selected block is itself a `nav-item` mega menu — open it.
    const triggerInside = findOneElement(target, '.js-megamenu-trigger')
    if (triggerInside != null) {
      const blockId = triggerInside.dataset.blockId
      if (blockId != null) {
        cancelClose()
        openPanel(blockId)
        return
      }
    }

    // 2. The selected block lives inside a panel — open its parent.
    const containingPanel = target.closest('.js-megamenu-panel')
    if (containingPanel instanceof HTMLElement) {
      const panelBlockId = containingPanel.id.replace('megamenu-panel-', '')
      if (panelBlockId.length > 0) {
        cancelClose()
        openPanel(panelBlockId)
      }
    }
  }

  const handleBlockDeselect = (evt: Event): void => {
    if (!(evt.target instanceof HTMLElement) || openBlockId == null) {
      return
    }
    if (!section.contains(evt.target)) {
      return
    }
    cancelClose()
    closePanelImmediate(openBlockId, true)
  }

  if (designMode) {
    namespace.addDocumentEventListener(
      'shopify:block:select',
      handleBlockSelect
    )
    namespace.addDocumentEventListener(
      'shopify:block:deselect',
      handleBlockDeselect
    )
  }

  const mobileDrawer = findOneElement(section, '.js-mobile-drawer')
  const mobileDrawerBg = findOneElement(section, '.js-mobile-drawer-bg')
  const mobileDrawerTrigger = findOneElement(
    section,
    '.js-mobile-drawer-trigger'
  )

  let mobileDrawerFocusTrap: FocusTrap | null = null
  let mobileDrawerLastFocus: HTMLElement | null = null

  const closeAllMobileAccordions = (): void => {
    findElements(section, '.js-mobile-accordion-trigger').forEach((trigger) => {
      trigger.setAttribute('aria-expanded', 'false')
      const panelId = trigger.getAttribute('aria-controls')
      if (panelId == null) {
        return
      }
      const panel = document.getElementById(panelId)
      if (panel == null) {
        return
      }
      panel.setAttribute('aria-hidden', 'true')
    })
    setDisableOuterAccordionPanelsExposed(false)
  }

  // `disable_outer_accordion` panels have no trigger, so flip
  // `aria-hidden` / `hidden` when the drawer opens or closes to keep them
  // reachable by screen readers.
  const setDisableOuterAccordionPanelsExposed = (exposed: boolean): void => {
    findElements(
      section,
      '.js-megamenu-panel[data-disable-outer-accordion="true"]'
    ).forEach((panel) => {
      if (exposed) {
        panel.removeAttribute('hidden')
        panel.setAttribute('aria-hidden', 'false')
      } else {
        panel.setAttribute('aria-hidden', 'true')
        panel.setAttribute('hidden', '')
      }
    })
  }

  const openMobileDrawer = (): void => {
    if (mobileDrawer == null) {
      return
    }
    if (section.dataset.mobileDrawerOpen === 'true') {
      return
    }

    mobileDrawerLastFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    section.dataset.mobileDrawerOpen = 'true'
    mobileDrawer.dataset.mobileDrawerOpen = 'true'
    mobileDrawerTrigger?.setAttribute('aria-expanded', 'true')
    // Reveal the header chrome so the drawer's anchored close button isn't
    // hanging in the air above a hidden header.
    section.dataset.hidden = 'false'
    setDisableOuterAccordionPanelsExposed(true)

    freeze(MOBILE_DRAWER_LOCK_CLASS)
    setPageRegionsInert(true)

    if (mobileDrawerFocusTrap == null) {
      mobileDrawerFocusTrap = createFocusTrap(mobileDrawer, {
        initialFocus: false,
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        allowOutsideClick: true,
        returnFocusOnDeactivate: false,
        tabbableOptions: { displayCheck: 'none' }
      })
    }
    try {
      mobileDrawerFocusTrap.activate()
    } catch {
      // focus-trap throws when there are no tabbable elements yet
    }
  }

  const closeMobileDrawer = (): void => {
    if (mobileDrawer == null) {
      return
    }
    if (section.dataset.mobileDrawerOpen !== 'true') {
      return
    }

    delete section.dataset.mobileDrawerOpen
    delete mobileDrawer.dataset.mobileDrawerOpen
    mobileDrawerTrigger?.setAttribute('aria-expanded', 'false')

    mobileDrawerFocusTrap?.deactivate()

    setPageRegionsInert(false)
    thaw(MOBILE_DRAWER_LOCK_CLASS)

    // Collapse every accordion so the drawer always reopens in a clean state.
    closeAllMobileAccordions()

    if (mobileDrawerLastFocus != null && mobileDrawerLastFocus.isConnected) {
      mobileDrawerLastFocus.focus()
    }
    mobileDrawerLastFocus = null
  }

  if (mobileDrawerTrigger != null) {
    namespace.addDirectEventListener(
      mobileDrawerTrigger,
      'click',
      (_target, evt) => {
        evt.preventDefault()
        openMobileDrawer()
      }
    )
  }

  namespace.addDelegatedEventListener(
    document,
    '.js-mobile-drawer-close',
    'click',
    (_target, evt) => {
      evt.preventDefault()
      closeMobileDrawer()
    }
  )

  if (mobileDrawerBg != null) {
    namespace.addDirectEventListener(mobileDrawerBg, 'click', () => {
      closeMobileDrawer()
    })
  }

  namespace.addDocumentEventListener('keydown', (evt) => {
    if (!(evt instanceof KeyboardEvent) || evt.key !== 'Escape') {
      return
    }
    if (section.dataset.mobileDrawerOpen === 'true') {
      closeMobileDrawer()
    }
  })

  const desktopBreakpointMql = window.matchMedia(DESKTOP_BREAKPOINT_QUERY)
  const handleBreakpointChange = (evt: MediaQueryListEvent): void => {
    if (!evt.matches) {
      return
    }
    if (mobileDrawer?.dataset.drawerModeOnDesktop === 'true') {
      return
    }
    closeMobileDrawer()
  }
  desktopBreakpointMql.addEventListener('change', handleBreakpointChange)

  // Suppress drawer transitions while the user is actively resizing. The
  // closed drawer anchors off-screen on different sides per breakpoint
  // (right for mobile, left for drawer-mode-on-desktop). Without this guard
  // the live `transform` transition would animate that anchor swap and
  // flash the closed drawer across the viewport on every breakpoint cross.
  const RESIZE_SETTLE_MS = 150
  let resizeSettleTimer: ReturnType<typeof setTimeout> | null = null
  const handleWindowResize = (): void => {
    document.body.classList.add('is-resizing')
    if (resizeSettleTimer != null) {
      clearTimeout(resizeSettleTimer)
    }
    resizeSettleTimer = setTimeout(() => {
      document.body.classList.remove('is-resizing')
      resizeSettleTimer = null
    }, RESIZE_SETTLE_MS)
  }
  window.addEventListener('resize', handleWindowResize)

  // Any other drawer opening should dismiss both the open mega menu and
  // the mobile drawer — the surfaces must never stack. The offcanvas
  // system flips `data-offcanvas` on <body> when a drawer becomes active,
  // so we observe that attribute instead of subscribing to a custom event.
  const offcanvasObserver = new MutationObserver(() => {
    if (!document.body.hasAttribute('data-offcanvas')) {
      return
    }
    if (openBlockId != null) {
      cancelClose()
      closePanelImmediate(openBlockId, true)
    }
    if (section.dataset.mobileDrawerOpen === 'true') {
      closeMobileDrawer()
    }
  })
  offcanvasObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-offcanvas']
  })

  const toggleMobileAccordion = (trigger: HTMLElement): void => {
    const panelId = trigger.getAttribute('aria-controls')
    if (panelId == null) {
      return
    }
    const panel = document.getElementById(panelId)
    if (panel == null) {
      return
    }

    const isExpanded = trigger.getAttribute('aria-expanded') === 'true'
    const next = !isExpanded

    trigger.setAttribute('aria-expanded', next ? 'true' : 'false')
    panel.setAttribute('aria-hidden', next ? 'false' : 'true')
  }

  namespace.addDelegatedEventListener(
    section,
    '.js-mobile-accordion-trigger',
    'click',
    (trigger, evt) => {
      evt.preventDefault()
      toggleMobileAccordion(trigger)
    }
  )

  // Inline triggers visible when drawer-mode-on-desktop is enabled.
  const drawerTriggersContainer = findOneElement(section, '.js-drawer-triggers')
  if (drawerTriggersContainer != null) {
    findElements(section, '.js-inline-drawer-trigger').forEach((el) => {
      drawerTriggersContainer.appendChild(el)
      el.removeAttribute('hidden')
    })
  }

  // Open the inline trigger
  namespace.addDelegatedEventListener(
    section,
    '.js-drawer-trigger',
    'click',
    (trigger, evt) => {
      evt.preventDefault()
      openMobileDrawer()
      const blockId = trigger.dataset.blockId
      if (blockId == null) {
        return
      }
      const accordionTrigger = findOneElement(
        section,
        `.js-mobile-accordion-trigger[data-block-id="${blockId}"]`
      )
      if (
        accordionTrigger != null &&
        accordionTrigger.getAttribute('aria-expanded') !== 'true'
      ) {
        toggleMobileAccordion(accordionTrigger)
      }
    }
  )

  // Keyboard navigation across sibling triggers in the same accordion
  // group. `data-mobile-accordion-group` is set on the drawer's `<ul>` for
  // top-level triggers, and on each mega menu's `panel__inner` for inner
  // triggers. Triggers inside a deeper group are filtered out so Arrow
  // keys never leak across panels.
  const focusSiblingTrigger = (
    current: HTMLElement,
    direction: 'next' | 'previous' | 'first' | 'last'
  ): void => {
    const group = current.closest('[data-mobile-accordion-group]')
    if (!(group instanceof HTMLElement)) {
      return
    }
    const siblings = findElements(group, '.js-mobile-accordion-trigger').filter(
      (trigger) => trigger.closest('[data-mobile-accordion-group]') === group
    )
    if (siblings.length === 0) {
      return
    }

    const currentIndex = siblings.indexOf(current)
    let target: HTMLElement | undefined
    switch (direction) {
      case 'next':
        target = siblings[(currentIndex + 1) % siblings.length]
        break
      case 'previous':
        target =
          siblings[(currentIndex - 1 + siblings.length) % siblings.length]
        break
      case 'first':
        target = siblings[0]
        break
      case 'last':
        target = siblings[siblings.length - 1]
        break
    }
    target?.focus()
  }

  namespace.addDelegatedEventListener(
    section,
    '.js-mobile-accordion-trigger',
    'keydown',
    (trigger, evt) => {
      if (!(evt instanceof KeyboardEvent)) {
        return
      }

      switch (evt.key) {
        case 'ArrowDown':
          evt.preventDefault()
          focusSiblingTrigger(trigger, 'next')
          break
        case 'ArrowUp':
          evt.preventDefault()
          focusSiblingTrigger(trigger, 'previous')
          break
        case 'Home':
          evt.preventDefault()
          focusSiblingTrigger(trigger, 'first')
          break
        case 'End':
          evt.preventDefault()
          focusSiblingTrigger(trigger, 'last')
          break
      }
    }
  )

  handleScroll()

  return {
    unload: () => {
      releaseFocusTrap()
      setPageRegionsInert(false)
      unlockBodyForMegamenu()
      mobileDrawerFocusTrap?.deactivate()
      mobileDrawerFocusTrap = null
      if (section.dataset.mobileDrawerOpen === 'true') {
        thaw(MOBILE_DRAWER_LOCK_CLASS)
      }
      delete section.dataset.mobileDrawerOpen
      if (mobileDrawer != null) {
        delete mobileDrawer.dataset.mobileDrawerOpen
      }
      mobileDrawerLastFocus = null
      desktopBreakpointMql.removeEventListener('change', handleBreakpointChange)
      window.removeEventListener('resize', handleWindowResize)
      if (resizeSettleTimer != null) {
        clearTimeout(resizeSettleTimer)
        resizeSettleTimer = null
      }
      document.body.classList.remove('is-resizing')
      closeAllMobileAccordions()

      section.removeAttribute('data-scrolled')
      section.removeAttribute('data-hidden')
      section.removeAttribute('data-megamenu-open')
      section.removeAttribute('data-design-mode')
      namespace.destroy()
      offcanvasObserver.disconnect()

      if (closeTimer != null) {
        clearTimeout(closeTimer)
        closeTimer = null
      }

      // Reset every megamenu trigger/panel back to a closed, hidden state so
      // theme-editor section reloads start from a known baseline.
      findElements(section, '.js-megamenu-trigger').forEach((trigger) => {
        trigger.setAttribute('aria-expanded', 'false')
      })
      findElements(section, '.js-megamenu-panel').forEach((panel) => {
        const blockId = panel.id.replace('megamenu-panel-', '')
        clearPendingCloseListener(panel, blockId)
        panel.setAttribute('aria-hidden', 'true')
        delete panel.dataset.crossfade
        panel.setAttribute('hidden', '')
      })
      openBlockId = null
      pendingCloseListeners.clear()
    }
  }
})
