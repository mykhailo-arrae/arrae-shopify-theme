import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements } from '../../core/dom/traversal/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'

const HOVER_VIDEO_SELECTOR = 'video.js-card-hover-video'

const playHoverVideos = (card: Element): void => {
  const hoverVideos = findElements(card, HOVER_VIDEO_SELECTOR)
  hoverVideos.forEach((el) => {
    if (el instanceof HTMLVideoElement) {
      void el.play().catch(() => {
        /* autoplay policies / missing source */
      })
    }
  })
}

const pauseHoverVideos = (card: Element): void => {
  const hoverVideos = findElements(card, HOVER_VIDEO_SELECTOR)
  hoverVideos.forEach((el) => {
    if (el instanceof HTMLVideoElement) {
      el.pause()
      el.currentTime = 0
    }
  })
}

initSnippet('tile-card', (snippet) => {
  const namespace = makeEventNamespace()

  const tileCards = findElements(snippet, '.js-card')
  tileCards.forEach((card) => {
    if (!(card instanceof HTMLElement)) {
      return
    }

    namespace.addDirectEventListener(card, 'mouseenter', (card) => {
      playHoverVideos(card)
    })
    namespace.addDirectEventListener(card, 'mouseleave', (card) => {
      pauseHoverVideos(card)
    })

    namespace.addDirectEventListener(card, 'focusin', (card) => {
      playHoverVideos(card)
    })
    namespace.addDirectEventListener(card, 'focusout', (card) => {
      pauseHoverVideos(card)
    })
  })

  return () => {
    namespace.destroy()
  }
})
