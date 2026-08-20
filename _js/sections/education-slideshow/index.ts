import Swiper from 'swiper'
import { Autoplay, EffectFade } from 'swiper/modules'
import { prefersReducedMotion } from '../../core/accessibility/prefers-reduced-motion.js'
import { updateSlideTabIndexes } from '../../core/accessibility/swiper-slides-tabs.js'
import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'

const DEFAULT_AUTOPLAY_DELAY = 6000

const getSlideIndex = (element: HTMLElement): number => {
  return Number.parseInt(element.getAttribute('data-slide-index') || '0', 10)
}

type ProgressMode = 'static' | 'animated'

const setProgressBar = (bar: HTMLElement, progress: number): void => {
  const clampedProgress = Math.max(0, Math.min(100, progress))
  bar.style.width = `${clampedProgress}%`
}

const fillAnnounceTemplate = (
  template: string,
  current: number,
  count: number,
  title: string
): string => {
  return template
    .replaceAll('[[current]]', String(current))
    .replaceAll('[[count]]', String(count))
    .replaceAll('[[title]]', title)
}

initSection('.js-education-slideshow', (section) => {
  const namespace = makeEventNamespace()
  const slideshowElement = findOneElement(section, '[data-education-slideshow]')

  if (slideshowElement === null) {
    return {
      unload: () => {
        namespace.destroy()
      }
    }
  }

  const swiperElement = findOneElement(
    slideshowElement,
    '[data-education-slideshow-viewport]'
  )
  const navItems = findElements(
    slideshowElement,
    '[data-education-slideshow-nav-item]'
  )
  const progressBars = findElements(
    slideshowElement,
    '[data-education-slideshow-progress-bar]'
  )
  const navElement = findOneElement(
    slideshowElement,
    '[data-education-slide-navigation]'
  )
  const navScrollContainer = findOneElement(
    slideshowElement,
    '[data-education-slideshow-nav-scroll]'
  )
  const playbackButton = findOneElement(
    slideshowElement,
    '[data-education-slideshow-playback]'
  )
  const liveRegion = findOneElement(
    slideshowElement,
    '[data-education-slideshow-live-region]'
  )

  if (swiperElement === null) {
    return {
      unload: () => {
        namespace.destroy()
      }
    }
  }

  const slideCount = Number.parseInt(
    slideshowElement.getAttribute('data-slide-count') || '0',
    10
  )

  if (Number.isNaN(slideCount) || slideCount < 1) {
    return {
      unload: () => {
        namespace.destroy()
      }
    }
  }

  const autoplayDelay =
    Number.parseInt(
      slideshowElement.getAttribute('data-autoplay-speed') || '',
      10
    ) || DEFAULT_AUTOPLAY_DELAY

  const shouldAutoplay =
    slideshowElement.getAttribute('data-autoplay') === 'true' &&
    !prefersReducedMotion()

  const announceTemplate =
    slideshowElement.getAttribute('data-a11y-announce-template') ?? ''
  const labelPlay =
    slideshowElement.getAttribute('data-a11y-play') ?? 'Play slideshow'
  const labelPause =
    slideshowElement.getAttribute('data-a11y-pause') ?? 'Pause slideshow'

  const syncNavOverflow = (): void => {
    if (navScrollContainer === null || navElement === null) {
      return
    }

    const overflows =
      navScrollContainer.scrollWidth > navScrollContainer.clientWidth + 1

    navElement.setAttribute('data-nav-overflow', overflows ? 'true' : 'false')
  }

  const navResizeObserver =
    navScrollContainer !== null
      ? new ResizeObserver(() => {
          syncNavOverflow()
        })
      : null

  if (navScrollContainer !== null && navResizeObserver !== null) {
    navResizeObserver.observe(navScrollContainer)
  }

  const resetProgressBars = (): void => {
    progressBars.forEach((bar) => {
      setProgressBar(bar, 0)
    })
  }

  const getProgressMode = (): ProgressMode => {
    return navElement?.getAttribute('data-progress-mode') === 'animated'
      ? 'animated'
      : 'static'
  }

  const setProgressMode = (mode: ProgressMode): void => {
    navElement?.setAttribute('data-progress-mode', mode)
  }

  const applyStaticProgress = (activeIndex: number): void => {
    progressBars.forEach((bar) => {
      setProgressBar(bar, getSlideIndex(bar) === activeIndex ? 100 : 0)
    })
  }

  const syncProgressDisplay = (activeIndex: number): void => {
    if (getProgressMode() === 'static') {
      applyStaticProgress(activeIndex)
    }
  }

  const updateActiveNavigation = (activeIndex: number): void => {
    navItems.forEach((item) => {
      const isActive = getSlideIndex(item) === activeIndex
      if (isActive) {
        item.setAttribute('aria-current', 'true')
      } else {
        item.removeAttribute('aria-current')
      }
      item.setAttribute('data-active', isActive ? 'true' : 'false')
    })
  }

  const scrollActiveNavItemIntoView = (activeIndex: number): void => {
    if (navScrollContainer === null) {
      return
    }

    const activeItem = navItems.find(
      (item) => getSlideIndex(item) === activeIndex
    )

    if (activeItem === undefined) {
      return
    }

    if (navScrollContainer.scrollWidth <= navScrollContainer.clientWidth) {
      return
    }

    activeItem.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center'
    })
  }

  const updateTextContrast = (realIndex: number): void => {
    const activeSlide = findOneElement(
      slideshowElement,
      `[data-education-slide][data-slide-index="${realIndex}"]`
    )

    if (activeSlide == null) {
      return
    }

    const contrast = activeSlide.getAttribute('data-text-contrast') ?? 'light'
    navElement?.setAttribute('data-text-contrast', contrast)
    slideshowElement.setAttribute('data-text-contrast', contrast)
  }

  const syncActiveSlideUi = (realIndex: number): void => {
    updateActiveNavigation(realIndex)
    updateTextContrast(realIndex)
    syncProgressDisplay(realIndex)
    scrollActiveNavItemIntoView(realIndex)
  }

  const announceActiveSlide = (sw: Swiper): void => {
    if (liveRegion === null || announceTemplate === '') {
      return
    }

    const activeSlide = sw.slides[sw.activeIndex]

    if (activeSlide == null || !(activeSlide instanceof HTMLElement)) {
      return
    }

    const title = activeSlide.getAttribute('data-slide-title')?.trim() ?? ''

    liveRegion.textContent = fillAnnounceTemplate(
      announceTemplate,
      sw.realIndex + 1,
      slideCount,
      title
    )
  }

  const updateNestedCarousels = (realIndex: number): void => {
    const slide = findOneElement(
      slideshowElement,
      `[data-education-slide][data-slide-index="${realIndex}"]`
    )

    if (slide == null) {
      return
    }

    slide
      .querySelectorAll<HTMLElement & { swiper?: Swiper }>(
        '[data-slide-content] .swiper'
      )
      .forEach((carouselElement) => {
        const nestedSwiper = carouselElement.swiper

        if (nestedSwiper == null) {
          return
        }

        nestedSwiper.updateSize()
        nestedSwiper.updateSlides()
        nestedSwiper.updateProgress()
        nestedSwiper.navigation?.update()
        nestedSwiper.update()
      })
  }

  const updatePlaybackButton = (isPlaying: boolean): void => {
    if (playbackButton === null) {
      return
    }

    playbackButton.setAttribute(
      'data-playback-status',
      isPlaying ? 'playing' : 'paused'
    )

    playbackButton.setAttribute(
      'aria-label',
      isPlaying ? labelPause : labelPlay
    )
  }

  const swiper = new Swiper(swiperElement, {
    modules: [Autoplay, EffectFade],
    init: false,
    loop: false,
    slidesPerView: 1,
    allowTouchMove: false,
    watchSlidesProgress: true,
    effect: 'fade',
    fadeEffect: {
      crossFade: true
    },
    speed: 700,
    autoplay: {
      delay: autoplayDelay,
      disableOnInteraction: false
    },
    on: {
      init: (sw) => {
        syncActiveSlideUi(sw.realIndex)
        updateSlideTabIndexes(sw)
        updateNestedCarousels(sw.realIndex)
      },
      autoplayTimeLeft: (sw, _timeLeft, percentage) => {
        if (getProgressMode() !== 'animated') {
          return
        }

        const activeProgressBar = progressBars.find(
          (bar) => getSlideIndex(bar) === sw.realIndex
        )

        if (activeProgressBar === undefined) {
          return
        }

        setProgressBar(activeProgressBar, 100 - percentage * 100)
      },
      slideChange: (sw) => {
        resetProgressBars()
        syncActiveSlideUi(sw.realIndex)
        updateSlideTabIndexes(sw)
        announceActiveSlide(sw)
        updateNestedCarousels(sw.realIndex)
      }
    }
  })

  namespace.addDelegatedEventListener(
    slideshowElement,
    '[data-education-slideshow-nav-item]',
    'click',
    (target) => {
      const slideIndex = getSlideIndex(target)

      if (Number.isNaN(slideIndex)) {
        return
      }

      resetProgressBars()
      swiper.slideTo(slideIndex)
    }
  )

  namespace.addDelegatedEventListener(
    slideshowElement,
    '[data-education-slideshow-playback]',
    'click',
    (target) => {
      const isPlaying =
        target.getAttribute('data-playback-status') === 'playing'

      if (isPlaying) {
        swiper.autoplay.pause()
        setProgressMode('static')
        applyStaticProgress(swiper.realIndex)
        updatePlaybackButton(false)
        return
      }

      setProgressMode('animated')

      if (swiper.autoplay.running) {
        swiper.autoplay.resume()
      } else {
        swiper.autoplay.start()
      }

      updatePlaybackButton(true)
    }
  )

  swiper.init()

  syncNavOverflow()

  if (shouldAutoplay) {
    swiper.autoplay.start()
    setProgressMode('animated')
  } else {
    swiper.autoplay.stop()
    setProgressMode('static')
    applyStaticProgress(swiper.realIndex)
  }

  updatePlaybackButton(shouldAutoplay)

  return {
    unload: () => {
      navResizeObserver?.disconnect()
      namespace.destroy()
      swiper.destroy()
    },
    selectBlock: (block) => {
      const wasPlaying = swiper.autoplay.running
      swiper.autoplay.stop()
      setProgressMode('static')
      updatePlaybackButton(false)

      const slideElement = block.closest('[data-education-slide]')
      const slideIndexFromBlock = slideElement?.getAttribute('data-slide-index')
      const slideIndexFromSwiper = block
        .closest('.swiper-slide')
        ?.getAttribute('data-swiper-slide-index')
      const slideIndex = Number.parseInt(
        slideIndexFromBlock ?? slideIndexFromSwiper ?? '',
        10
      )

      if (Number.isNaN(slideIndex) === false) {
        swiper.slideTo(slideIndex)
        syncActiveSlideUi(slideIndex)
        updateNestedCarousels(slideIndex)
      }

      return () => {
        if (wasPlaying) {
          setProgressMode('animated')
          swiper.autoplay.start()
          updatePlaybackButton(true)
        }
      }
    }
  }
})
