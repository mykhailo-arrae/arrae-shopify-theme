import Swiper from 'swiper'
import { A11y, Autoplay, Navigation } from 'swiper/modules'
import { prefersReducedMotion } from '../../core/accessibility/prefers-reduced-motion.js'
import { updateSlideTabIndexes } from '../../core/accessibility/swiper-slides-tabs.js'
import { findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'

const ARROW_WIDTH_PX = 32 // arrow button width
const ARROW_GAP_PX = 8 // visual breathing room between text and arrow button

const parseIntAttr = (value: string | null, fallback: number): number => {
  if (value == null) {
    return fallback
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

// Measures the widest announcement text and writes its computed offset to
// `--arrow-offset` on the section. The CSS uses this var as
// `margin-left/-right: calc(var(--arrow-offset) * -1)` on the arrows, so they
// always sit `ARROW_GAP_PX` away from the longest text — no matter how short
// or long any single announcement is.
const updateArrowOffset = (section: HTMLElement): void => {
  const textElements = section.querySelectorAll('.js-announcement-text')
  let maxWidth = 0
  for (const element of Array.from(textElements)) {
    if (element instanceof HTMLElement) {
      const width = element.getBoundingClientRect().width
      if (width > maxWidth) {
        maxWidth = width
      }
    }
  }
  if (maxWidth <= 0) {
    return
  }
  const offset = maxWidth / 2 + ARROW_GAP_PX + ARROW_WIDTH_PX
  section.style.setProperty('--arrow-offset', `${offset}px`)
}

initSection('.js-announcement-section', (section) => {
  const swiperElement = findOneElement(section, '.js-slider')

  if (swiperElement == null) {
    return { unload: null }
  }

  const slideCount = parseIntAttr(
    swiperElement.getAttribute('data-item-count'),
    0
  )
  const autoplayDelay = parseIntAttr(
    swiperElement.getAttribute('data-autoplay-delay'),
    4
  )

  if (slideCount < 2) {
    return { unload: null }
  }

  const reducedMotion = prefersReducedMotion()

  const settings = {
    modules: [Navigation, Autoplay, A11y],
    speed: 600,
    loop: true,
    slidesPerView: 1,
    watchSlidesProgress: true,
    a11y: {
      enabled: true
    },
    autoplay: reducedMotion
      ? false
      : {
          delay: autoplayDelay * 1000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        },
    navigation: {
      nextEl: findOneElement(section, '.js-slider-next'),
      prevEl: findOneElement(section, '.js-slider-prev')
    },
    on: {
      init: (swiperInstance: Swiper) => {
        updateSlideTabIndexes(swiperInstance)
      },
      slideChange: (swiperInstance: Swiper) => {
        updateSlideTabIndexes(swiperInstance)
      }
    }
  }

  const swiper = new Swiper(swiperElement, settings)

  updateArrowOffset(section)
  // Web fonts can change the rendered text width — recalculate once they load.
  void document.fonts?.ready.then(() => {
    updateArrowOffset(section)
  })

  return {
    unload: () => {
      swiper.destroy()
    }
  }
})
