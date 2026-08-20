import Swiper from 'swiper'
import { A11y, Navigation } from 'swiper/modules'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'

const initImageCarousel = (carouselEl: HTMLElement): (() => void) => {
  const viewportEl = carouselEl.parentElement

  const globalNavigation =
    viewportEl == null ? null : findOneElement(viewportEl, '.js-nav-arrows')

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
    modules: hasNavigation ? [A11y, Navigation] : [A11y],
    a11y: {
      enabled: true
    },
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

  if (globalNavigation != null) {
    globalNavigation.style.display = 'flex'
  }

  return () => {
    carousel.destroy(true, true)
  }
}

initSnippet('slide-content-image-carousel', (snippet) => {
  const carouselEls = findElements(
    snippet,
    '[data-slide-content="image-carousel"] [data-image-carousel]'
  )

  if (carouselEls.length === 0) {
    return
  }

  const destroyFns = carouselEls.map(initImageCarousel)

  return () => {
    destroyFns.forEach((destroy) => {
      destroy()
    })
  }
})
