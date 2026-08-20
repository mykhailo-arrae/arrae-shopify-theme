import { prefersReducedMotion } from '../../core/accessibility/prefers-reduced-motion.js'
import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'
import styles from './styles.scss.js'

type CustomWindow = Window & {
  Shopify?: { designMode?: boolean }
}

declare let window: CustomWindow

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'

const getCardIndex = (element: HTMLElement): number =>
  Number.parseInt(element.getAttribute('data-index') ?? '-1', 10)

const measureStickyTop = (): number => {
  return window.innerWidth >= 1024 ? 24 : 48
}

initSection('.js-timeline', (section) => {
  const namespace = makeEventNamespace()
  const root = findOneElement(section, '[data-timeline]')

  if (root === null) {
    return {
      unload: () => {
        namespace.destroy()
      }
    }
  }

  const cards = findElements(root, '[data-timeline-card]')
  const track = findOneElement(root, '[data-timeline-track]')
  const desktopMedia = window.matchMedia(DESKTOP_MEDIA_QUERY)
  const stickyTopVar = styles['--timeline-sticky-top']
  const cardMinHeightVar = styles['--timeline-card-min-height']

  // Must stay aligned with `$mobile-stack-peek` in styles.scss.
  const MOBILE_STACK_PEEK_PX = 62

  // Desktop: one card is featured at a time.
  const setActiveCard = (index: number): void => {
    cards.forEach((card) => {
      if (getCardIndex(card) === index) {
        card.setAttribute('data-active', 'true')
      } else {
        card.removeAttribute('data-active')
      }
    })
  }

  const syncDesktopCardA11y = (): void => {
    cards.forEach((card) => {
      if (desktopMedia.matches) {
        card.setAttribute('tabindex', '0')
      } else {
        card.removeAttribute('tabindex')
      }
    })
  }

  // Mobile sticky stack needs equal card heights so each card fully covers the previous one.
  // Desktop uses a row + scale and does not need this measurement.
  const equalizeCardHeights = (): void => {
    if (cards.length === 0) {
      return
    }

    root.style.removeProperty(cardMinHeightVar)

    if (desktopMedia.matches) {
      return
    }

    let tallest = 0
    cards.forEach((card) => {
      tallest = Math.max(tallest, card.offsetHeight)
    })

    if (tallest > 0) {
      root.style.setProperty(cardMinHeightVar, `${tallest}px`)
    }
  }

  let equalizeScheduled = false
  const scheduleEqualize = (): void => {
    if (equalizeScheduled) {
      return
    }

    equalizeScheduled = true
    requestAnimationFrame(() => {
      equalizeScheduled = false
      equalizeCardHeights()
      syncStackStickyOffsets()
    })
  }

  namespace.addDelegatedEventListener(
    root,
    '[data-timeline-card]',
    'click',
    (target) => {
      if (!desktopMedia.matches) {
        return
      }

      setActiveCard(getCardIndex(target))
    }
  )

  namespace.addDelegatedEventListener(
    root,
    '[data-timeline-card]',
    'keydown',
    (target, evt) => {
      if (!desktopMedia.matches || !(evt instanceof KeyboardEvent)) {
        return
      }

      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault()
        setActiveCard(getCardIndex(target))
      }
    }
  )

  const designMode = window.Shopify?.designMode === true
  const stackingEnabled =
    track !== null &&
    !designMode &&
    !prefersReducedMotion() &&
    cards.length >= 2

  let throttling = false
  let lastHeaderHidden: boolean | null = null

  const getStackPeekSteps = (index: number, lastIndex: number): number => {
    if (index === lastIndex) {
      return Math.max(0, lastIndex - 1)
    }

    return index
  }

  const getCardStickyTop = (
    stickyTop: number,
    index: number,
    lastIndex: number
  ): number => {
    const peekSteps = getStackPeekSteps(index, lastIndex)

    return stickyTop + peekSteps * MOBILE_STACK_PEEK_PX
  }

  const syncStackStickyOffsets = (): void => {
    if (track === null || track.dataset.stack !== 'true') {
      return
    }

    if (desktopMedia.matches) {
      cards.forEach((card) => {
        card.style.removeProperty('top')
      })
      return
    }

    const stickyTop = measureStickyTop()
    const lastIndex = cards.length - 1

    cards.forEach((card, index) => {
      card.style.top = `${getCardStickyTop(stickyTop, index, lastIndex)}px`
    })
  }

  const updateStickyTop = (): void => {
    root.style.setProperty(stickyTopVar, `${measureStickyTop()}px`)
    syncStackStickyOffsets()
  }

  const onScroll = (): void => {
    if (throttling) {
      return
    }

    throttling = true
    requestAnimationFrame(() => {
      updateStickyTop()

      throttling = false
    })
  }

  const onDesktopChange = (): void => {
    syncDesktopCardA11y()
    scheduleEqualize()
  }

  syncDesktopCardA11y()
  desktopMedia.addEventListener('change', onDesktopChange)

  namespace.addDelegatedEventListener(
    root,
    'img',
    'load',
    () => {
      scheduleEqualize()
    },
    { capture: true }
  )
  namespace.addWindowEventListener('resize', scheduleEqualize)

  // Web-font swaps reflow the descriptions after first paint, which changes the
  // tallest card — re-measure once fonts are ready.
  if ('fonts' in document) {
    void document.fonts.ready.then(() => {
      scheduleEqualize()
    })
  }

  if (stackingEnabled && track !== null) {
    track.dataset.stack = 'true'
    track.dataset.cardCount = String(cards.length)
    updateStickyTop()

    namespace.addDocumentEventListener('scroll', onScroll, { passive: true })
    namespace.addWindowEventListener('resize', updateStickyTop)
  }

  equalizeCardHeights()
  syncStackStickyOffsets()

  return {
    unload: () => {
      desktopMedia.removeEventListener('change', onDesktopChange)

      cards.forEach((card) => {
        card.removeAttribute('tabindex')
        card.style.removeProperty('top')
      })

      if (track !== null) {
        track.dataset.stack = 'false'
      }

      root.style.removeProperty(stickyTopVar)
      root.style.removeProperty(cardMinHeightVar)
      namespace.destroy()
    },
    selectBlock: (block) => {
      if (desktopMedia.matches) {
        setActiveCard(getCardIndex(block))
      }
    }
  }
})
