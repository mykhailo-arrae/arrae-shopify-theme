import Swiper from 'swiper'
import { Navigation } from 'swiper/modules'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'

const DEFAULT_ASPECT_RATIO = '700x564'

const syncFrameAspectRatio = (
  snippet: HTMLElement,
  activeIndex: number
): void => {
  const frame = findOneElement(snippet, '[data-ingredient-frame]')
  const slides = findElements(snippet, '[data-ingredient-aspect-ratio]')
  const activeSlide = slides[activeIndex]

  if (frame == null || activeSlide == null) {
    return
  }

  const aspectRatio =
    activeSlide.getAttribute('data-ingredient-aspect-ratio') ??
    DEFAULT_ASPECT_RATIO

  frame.setAttribute('data-aspect-ratio', aspectRatio)
}

initSnippet('slide-content-ingredients', (snippet) => {
  const carouselEl = findOneElement(
    snippet,
    '[data-slide-content="ingredients"] .swiper'
  )

  if (carouselEl == null) {
    return
  }

  const globalNavigation = findOneElement(
    snippet,
    '[data-slide-content="ingredients"] .js-nav-arrows'
  )

  const prevEl =
    globalNavigation == null
      ? null
      : findOneElement(globalNavigation, '.swiper-button-prev')
  const nextEl =
    globalNavigation == null
      ? null
      : findOneElement(globalNavigation, '.swiper-button-next')

  const hasNavigation = prevEl != null && nextEl != null

  // Do not pass `navigation: undefined` — Swiper's extend overwrites module
  // defaults and Navigation then crashes reading `.enabled` on init.
  const carousel = new Swiper(carouselEl, {
    modules: hasNavigation ? [Navigation] : [],
    nested: true,
    resizeObserver: true,
    watchOverflow: true,
    updateOnWindowResize: true,
    slidesPerView: 1,
    spaceBetween: 0,
    slidesOffsetAfter: 0,
    centeredSlides: false,
    allowTouchMove: true,
    ...(hasNavigation
      ? {
          navigation: {
            prevEl,
            nextEl
          }
        }
      : {})
  })

  syncFrameAspectRatio(snippet, carousel.activeIndex)

  carousel.on('slideChange', (sw) => {
    syncFrameAspectRatio(snippet, sw.activeIndex)
  })

  if (globalNavigation != null) {
    globalNavigation.style.display = 'flex'
  }

  return () => {
    carousel.destroy(true, true)
  }
})
