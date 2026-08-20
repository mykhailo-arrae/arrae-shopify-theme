import Swiper from 'swiper'
import { A11y, Navigation, Pagination } from 'swiper/modules'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'

/** Must stay aligned with `styles.scss` / `mq.min(smalldesktop)`. */
const DESKTOP_BREAKPOINT_PX = 1280

initSnippet('slide-content-feature-cards', (snippet) => {
  const carouselEl = findOneElement(
    snippet,
    '[data-slide-content="feature-cards"] .swiper'
  )

  if (carouselEl == null) {
    return
  }

  const slideCount = findElements(
    carouselEl,
    '.swiper-wrapper .swiper-slide'
  ).length

  const paginationEl = findOneElement(
    snippet,
    '[data-slide-content="feature-cards"] .swiper-pagination'
  )

  const globalNavigation = findOneElement(
    snippet,
    '[data-slide-content="feature-cards"] .js-nav-arrows'
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
  const hasPagination = paginationEl != null

  // Do not pass `navigation`/`pagination: undefined` — Swiper's extend
  // overwrites module defaults and then crashes reading `.enabled` on init.
  const carousel = new Swiper(carouselEl, {
    modules: [
      A11y,
      ...(hasNavigation ? [Navigation] : []),
      ...(hasPagination ? [Pagination] : [])
    ],
    a11y: {
      enabled: true
    },
    nested: true,
    resizeObserver: true,
    watchOverflow: true,
    updateOnWindowResize: true,
    allowTouchMove: true,
    slidesPerView: 1,
    spaceBetween: 0,
    slidesOffsetAfter: 0,
    centeredSlides: false,
    ...(hasNavigation
      ? {
          navigation: {
            prevEl,
            nextEl
          }
        }
      : {}),
    ...(hasPagination
      ? {
          pagination: {
            el: paginationEl,
            clickable: true
          }
        }
      : {}),
    breakpoints: {
      [DESKTOP_BREAKPOINT_PX]: {
        slidesPerView: Math.min(3, Math.max(1, slideCount)),
        slidesOffsetAfter: 0,
        spaceBetween: 16,
        allowTouchMove: false
      }
    }
  })

  if (globalNavigation != null) {
    globalNavigation.style.display = 'flex'
  }

  return () => {
    carousel.destroy(true, true)
  }
})
