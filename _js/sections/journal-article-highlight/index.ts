import Swiper from 'swiper'
import { A11y, Navigation, Pagination } from 'swiper/modules'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'

/** Must match Swiper `breakpoints` below. On this viewport and up, touch drag is off when slide count ≤ threshold. */
const DESKTOP_BREAKPOINT_PX = 1024

/** With this many slides or fewer on desktop: `allowTouchMove` is false (no rubber-band row drag). */
const MIN_SLIDES_FOR_TOUCH_DRAG = 3

initSection('.js-journal-article-highlight-section', (section) => {
  const carouselEl = findOneElement(section, '.swiper')
  const globalNavigation = findOneElement(section, '.js-nav-arrows')

  if (carouselEl == null) {
    return { unload: null }
  }

  const slideCount = findElements(
    carouselEl,
    '.swiper-wrapper .swiper-slide'
  ).length

  if (slideCount <= 1) {
    return { unload: null }
  }

  const carousel = new Swiper(carouselEl, {
    modules: [A11y, Navigation, Pagination],
    a11y: {
      enabled: true
    },
    watchOverflow: true,
    allowTouchMove: true,
    slidesPerView: 'auto',
    spaceBetween: 16,
    slidesOffsetAfter: 16,
    freeMode: false,
    centeredSlides: false,
    navigation: {
      nextEl: findOneElement(section, '.swiper-button-next'),
      prevEl: findOneElement(section, '.swiper-button-prev')
    },
    pagination: {
      el: findOneElement(section, '.swiper-pagination'),
      clickable: true
    },
    breakpoints: {
      [DESKTOP_BREAKPOINT_PX]: {
        slidesPerView: 3,
        slidesOffsetAfter: 0,
        freeMode: false,
        allowTouchMove: slideCount > MIN_SLIDES_FOR_TOUCH_DRAG
      }
    }
  })

  if (globalNavigation) {
    globalNavigation.style.display = 'flex'
  }

  return {
    unload: () => {
      carousel.destroy()
    }
  }
})
