import { findOneElement } from '../../core/dom/traversal/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'

const PREFERS_REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

const ARC_SELECTOR = '[data-pct-arc]'
const DASH_EMPTY = 100
const ANIM_DURATION_MS = 1150
/** Extra delay inside WAAPI after slide activation delay (kept small). */
const ANIM_DELAY_MS = 0
const ANIM_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'
/**
 * Wait after `swiper-slide-active` appears so the wheel animates in step with
 * the education slideshow fade (~500–700ms content reveal in `education-slide` styles).
 */
const SLIDE_ACTIVATION_DELAY_MS = 550

/** First intersection ratio before we allow any wheel animation (one-shot IO, then disconnect). */
const IO_THRESHOLD = 0.2

const parseDashEnd = (el: Element): number => {
  const raw = el.getAttribute('data-pct-dash-end')
  const n = raw == null ? Number.NaN : Number.parseFloat(raw)

  if (Number.isNaN(n)) {
    return DASH_EMPTY
  }

  return Math.max(0, Math.min(DASH_EMPTY, n))
}

const cancelArcAnimations = (el: Element): void => {
  for (const anim of el.getAnimations()) {
    anim.cancel()
  }
}

const resetArcs = (arcs: Element[]): void => {
  for (const el of arcs) {
    cancelArcAnimations(el)

    if (el instanceof SVGElement) {
      el.style.strokeDashoffset = String(DASH_EMPTY)
    }
  }
}

const playArcs = (arcs: Element[], reducedMotion: boolean): void => {
  for (const el of arcs) {
    cancelArcAnimations(el)
    const dashEnd = parseDashEnd(el)

    if (!(el instanceof SVGElement)) {
      continue
    }

    if (reducedMotion) {
      el.style.strokeDashoffset = String(dashEnd)
      continue
    }

    el.style.strokeDashoffset = ''
    el.animate(
      [{ strokeDashoffset: DASH_EMPTY }, { strokeDashoffset: dashEnd }],
      {
        duration: ANIM_DURATION_MS,
        delay: ANIM_DELAY_MS,
        easing: ANIM_EASING,
        fill: 'forwards'
      }
    )
  }
}

initSnippet('slide-content-percentage-stats', (snippet) => {
  const root = findOneElement(
    snippet,
    '[data-slide-content="percentage-stats"]'
  )

  if (root == null) {
    return
  }

  /* `findElements` only returns HTMLElements; arc nodes are SVG. */
  const arcs = Array.from(root.querySelectorAll(ARC_SELECTOR))

  if (arcs.length === 0) {
    return
  }

  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia(PREFERS_REDUCED_MOTION).matches

  const slideEl = snippet.closest('.swiper-slide')

  let activationTimer: number | null = null
  let viewportSeen = false

  const clearActivationTimer = (): void => {
    if (activationTimer != null) {
      window.clearTimeout(activationTimer)
      activationTimer = null
    }
  }

  const schedulePlayArcs = (): void => {
    clearActivationTimer()
    const waitMs = reducedMotion ? 0 : SLIDE_ACTIVATION_DELAY_MS
    activationTimer = window.setTimeout(() => {
      activationTimer = null
      playArcs(arcs, reducedMotion)
    }, waitMs)
  }

  const sync = (): void => {
    if (viewportSeen !== true) {
      if (
        slideEl != null &&
        slideEl.classList.contains('swiper-slide-active') !== true
      ) {
        clearActivationTimer()
        resetArcs(arcs)
      }

      return
    }

    if (slideEl == null) {
      schedulePlayArcs()
      return
    }

    if (slideEl.classList.contains('swiper-slide-active')) {
      schedulePlayArcs()
      return
    }

    clearActivationTimer()
    resetArcs(arcs)
  }

  const intersectionObserver = new IntersectionObserver(
    function (
      this: IntersectionObserver,
      entries: IntersectionObserverEntry[]
    ): void {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return
      }

      this.disconnect()
      viewportSeen = true
      sync()
    },
    {
      threshold: IO_THRESHOLD,
      rootMargin: '0px'
    }
  )

  intersectionObserver.observe(root)

  let slideObserver: MutationObserver | null = null

  if (slideEl != null) {
    slideObserver = new MutationObserver(() => {
      sync()
    })

    slideObserver.observe(slideEl, {
      attributes: true,
      attributeFilter: ['class']
    })
  }

  sync()

  return () => {
    clearActivationTimer()
    intersectionObserver.disconnect()
    slideObserver?.disconnect()
    resetArcs(arcs)

    for (const el of arcs) {
      if (el instanceof SVGElement) {
        el.style.strokeDashoffset = ''
      }
    }
  }
})
