import Swiper from 'swiper'
import { A11y, Navigation, Pagination } from 'swiper/modules'
import {
  findElements,
  findOneElement,
  findOneElementOfType
} from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'

/** Section + first slide must reach this ratio vs the viewport before the first-slide video autoplays. */
const VISIBILITY_MIN_RATIO = 0.18

/** Must match Swiper `breakpoints` below. On this viewport and up, touch drag is off when slide count ≤ threshold. */
const DESKTOP_BREAKPOINT_PX = 1024

/** Viewports using the single-row swipe carousel (`slidesPerView` &lt; 4); matches max-width below desktop breakpoint. */
const MOBILE_SWIPE_LAYOUT_MEDIA = `(max-width: ${DESKTOP_BREAKPOINT_PX - 1}px)`

/** When set, skip video autoplay and do not use intersection observers for it. */
const PREFERS_REDUCED_MOTION_MEDIA = '(prefers-reduced-motion: reduce)'

/** With this many slides or fewer on desktop: `allowTouchMove` is false (no rubber-band row drag). */
const MIN_SLIDES_FOR_TOUCH_DRAG = 4

const findVideo = findOneElementOfType(HTMLVideoElement)

const collectSectionVideos = (section: HTMLElement): HTMLVideoElement[] => {
  return findElements(section, 'video').filter(
    (el): el is HTMLVideoElement => el instanceof HTMLVideoElement
  )
}

const pauseAll = (videos: HTMLVideoElement[]) => {
  for (const video of videos) {
    video.pause()
  }
}

const isMobileSwipeCarouselLayout = (): boolean =>
  window.matchMedia(MOBILE_SWIPE_LAYOUT_MEDIA).matches

const pauseAndMuteAll = (videos: HTMLVideoElement[]) => {
  for (const video of videos) {
    video.pause()
    video.muted = true
  }
}

const syncFirstSlideAutoplay = (options: {
  sectionVisible: boolean
  firstSlideVisible: boolean
  section: HTMLElement
  firstSlide: HTMLElement | null
  firstSlideIntersectionActive: boolean
}) => {
  const {
    sectionVisible,
    firstSlideVisible,
    section,
    firstSlide,
    firstSlideIntersectionActive
  } = options
  const videos = collectSectionVideos(section)

  if (!firstSlideIntersectionActive) {
    if (!sectionVisible) {
      pauseAll(videos)
    }
    return
  }

  if (!sectionVisible || !firstSlideVisible) {
    pauseAll(videos)
    return
  }

  const firstVideo = firstSlide == null ? null : findVideo(firstSlide, 'video')

  if (firstVideo == null) {
    pauseAll(videos)
    return
  }

  for (const video of videos) {
    if (video !== firstVideo) {
      video.pause()
    }
  }

  firstVideo.muted = true
  void firstVideo.play().catch(() => undefined)
}

initSection('.js-ugc-section', (section) => {
  const carouselEl = findOneElement(section, '.swiper')
  const globalNavigation = findOneElement(section, '.js-nav-arrows')

  if (carouselEl == null) {
    return { unload: null }
  }

  const slideCount = findElements(
    carouselEl,
    '.swiper-wrapper .swiper-slide'
  ).length

  let firstSlideIntersectionActive = !window.matchMedia(
    PREFERS_REDUCED_MOTION_MEDIA
  ).matches

  const carousel = new Swiper(carouselEl, {
    modules: [A11y, Navigation, Pagination],
    a11y: {
      enabled: true
    },
    watchOverflow: true,
    allowTouchMove: true,
    slidesPerView: 1.19,
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
        slidesPerView: 4,
        slidesOffsetAfter: 0,
        freeMode: false,
        allowTouchMove: slideCount > MIN_SLIDES_FOR_TOUCH_DRAG
      }
    }
  })

  carousel.on('slideChangeTransitionEnd', () => {
    if (!isMobileSwipeCarouselLayout()) {
      return
    }
    pauseAndMuteAll(collectSectionVideos(section))
  })

  if (globalNavigation) {
    globalNavigation.style.display = 'flex'
  }

  let sectionVisible = false
  let firstSlideVisible = false

  const firstSlideEl = (): HTMLElement | null => {
    return findOneElement(carouselEl, '.swiper-wrapper .swiper-slide')
  }

  const runSync = () => {
    syncFirstSlideAutoplay({
      sectionVisible,
      firstSlideVisible,
      section,
      firstSlide: firstSlideEl(),
      firstSlideIntersectionActive
    })
  }

  const disconnectFirstSlideIntersectionAfterSwipe = () => {
    if (!firstSlideIntersectionActive) {
      return
    }
    firstSlideIntersectionActive = false
    firstSlideObserver?.disconnect()
    firstSlideObserver = null
    runSync()
  }

  let sectionObserver: IntersectionObserver | null = null
  let firstSlideObserver: IntersectionObserver | null = null

  const disconnectAutoplayIntersectionObservers = () => {
    sectionObserver?.disconnect()
    firstSlideObserver?.disconnect()
    sectionObserver = null
    firstSlideObserver = null
  }

  const connectAutoplayIntersectionObservers = () => {
    sectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry == null) {
          return
        }
        sectionVisible =
          entry.isIntersecting === true &&
          entry.intersectionRatio >= VISIBILITY_MIN_RATIO
        runSync()
      },
      { threshold: [0, 0.1, VISIBILITY_MIN_RATIO, 0.35, 0.6] }
    )

    sectionObserver.observe(section)

    const slide = firstSlideEl()
    if (slide != null) {
      firstSlideObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (entry == null) {
            return
          }
          firstSlideVisible =
            entry.isIntersecting === true &&
            entry.intersectionRatio >= VISIBILITY_MIN_RATIO
          runSync()
        },
        { threshold: [0, 0.1, VISIBILITY_MIN_RATIO, 0.35, 0.6] }
      )
      firstSlideObserver.observe(slide)
    }
  }

  if (firstSlideIntersectionActive) {
    connectAutoplayIntersectionObservers()
  }

  carousel.on('slideChange', disconnectFirstSlideIntersectionAfterSwipe)

  requestAnimationFrame(() => {
    runSync()
  })

  return {
    unload: () => {
      disconnectAutoplayIntersectionObservers()
      carousel.destroy()
      pauseAll(collectSectionVideos(section))
    }
  }
})
