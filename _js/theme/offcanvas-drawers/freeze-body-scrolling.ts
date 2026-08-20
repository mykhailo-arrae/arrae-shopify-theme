import { findOneElement } from '../../core/dom/traversal/index.js'

let oldBodyPosition = 0
let announcementTransparentSnapshot: string | null = null

// Marker classes that should keep the body locked even when a single
// caller asks to thaw. Lets the mega menu and a drawer coexist briefly
// without losing the user's scroll position when one of them tears down.
//
// `data-offcanvas` on <body> is the companion signal: any code path that
// opens a third-party drawer (cart, search) sets it via
// `freeze(..., offcanvasName)`. Other surfaces (the header mega menu and
// the mobile mega menu drawer) observe that attribute and dismiss
// themselves so the surfaces never stack on screen.
const LOCK_HOLDER_CLASSES = [
  'has-open-offcanvas',
  'has-open-megamenu',
  'has-open-mobile-drawer'
]

const hasAnyLockHolder = (body: HTMLElement): boolean =>
  LOCK_HOLDER_CLASSES.some((cls) => body.classList.contains(cls))

// NOTE: scrollbar compensation is handled at the scroll-container level
// with `scrollbar-gutter: stable` on <html> (see master.scss). Padding-
// based compensation on <body> does not help here because the announcement
// bar is `position: absolute; width: 100%` — absolute children reference
// the containing block's PADDING BOX, whose width is unaffected by
// `padding-right`. Reserving the gutter on <html> instead keeps the
// initial-containing-block width identical whether or not the scrollbar
// is currently rendered, so no descendant width ever changes on lock.

const syncAnnouncementForOffcanvas = (drawerOpen: boolean): void => {
  const announcementSection = findOneElement(
    document,
    '.js-announcement-section'
  )
  const announcementRoot =
    announcementSection &&
    findOneElement(announcementSection, '[data-transparent]')

  if (!announcementRoot) {
    return
  }

  if (drawerOpen) {
    if (announcementTransparentSnapshot === null) {
      announcementTransparentSnapshot =
        announcementRoot.getAttribute('data-transparent') ?? 'false'
    }
    announcementRoot.setAttribute('data-transparent', 'false')
    return
  }

  if (announcementTransparentSnapshot !== null) {
    announcementRoot.setAttribute(
      'data-transparent',
      announcementTransparentSnapshot
    )
    announcementTransparentSnapshot = null
  }
}
/**
 * @description Freeze body scrolling when offcanvas drawers are open
 */
export const freeze = (
  additionalClass = '',
  offcanvasName: string | null | undefined = null
): void => {
  const body = findOneElement(document, 'body')

  if (!body) {
    return
  }

  // If another lock holder already captured the scroll position, leave
  // that snapshot untouched. Otherwise `window.scrollY` would read `0`
  // (the body is already `position: fixed`) and overwrite the original
  // pre-lock position, causing the page to jump to the top on thaw.
  const isAlreadyLocked = body.style.top !== '' && hasAnyLockHolder(body)
  if (!isAlreadyLocked) {
    const offset = (window.scrollY || 0) * -1
    body.style.top = `${offset}px`
    oldBodyPosition = Number.parseInt(body.style.top, 10) || 0
  }

  body.classList.add('is-frozen', additionalClass)

  if (offcanvasName) {
    body.setAttribute('data-offcanvas', offcanvasName)
  }

  syncAnnouncementForOffcanvas(true)
}

/**
 * @description Unfreeze body scrolling after offcanvas drawers are closed
 */
export const thaw = (additionalClass = ''): void => {
  const body = findOneElement(document, 'body')

  if (!body) {
    return
  }

  body.classList.remove(additionalClass)

  if (additionalClass === 'has-open-offcanvas') {
    body.removeAttribute('data-offcanvas')
  }

  // If another lock holder still wants the body frozen (e.g. mega menu is
  // open while a drawer closes), leave `is-frozen`, `body.style.top`, and
  // the saved scroll position in place so the remaining holder owns the
  // lock until it releases. Keep the announcement bar in its non-transparent
  // snapshot too — restoring transparency now would flash the bar while
  // the remaining surface is still on screen.
  if (hasAnyLockHolder(body)) {
    return
  }

  syncAnnouncementForOffcanvas(false)
  body.classList.remove('is-frozen')
  body.style.top = ''

  if (oldBodyPosition) {
    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: oldBodyPosition * -1
      })
    })
  }
}
