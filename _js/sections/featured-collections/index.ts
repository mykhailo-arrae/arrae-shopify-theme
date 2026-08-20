import { debounce } from '@github/mini-throttle'
import Swiper from 'swiper'
import { A11y, Navigation, Pagination } from 'swiper/modules'
import type { SwiperModule, SwiperOptions } from 'swiper/types'
import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'

initSection('.js-featured-collection', (section) => {
  const namespace = makeEventNamespace()
  const controller = new AbortController()

  const tabButtons = findElements(section, '.js-tab')
  const tabPanels = findElements(section, '.js-panel')

  // Global navigation
  const globalNextBtn = findOneElement(section, '.swiper-button-next')
  const globalPrevBtn = findOneElement(section, '.swiper-button-prev')

  const globalNavigation = findOneElement(section, '.js-nav-arrows')

  let swiper: Swiper | null = null
  let activeTabValue: string | null = null

  // Track panel-specific resources to prevent memory leaks
  const panelResources = new Map<
    HTMLElement,
    {
      focusinListener: { remove: () => void } | null
    }
  >()

  const getSelectedTabValue = (): string | null => {
    const activeTab = tabButtons.find(
      (btn) => btn.getAttribute('aria-selected') === 'true'
    )
    const value = activeTab?.getAttribute('data-tab') ?? null
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
    return null
  }

  const getPanelIdFor = (value: string): string => {
    return `panel-${value}`
  }

  const getPanelByValue = (value: string): HTMLElement | null => {
    const id = getPanelIdFor(value)
    const panel = tabPanels.find((p) => p.id === id) ?? null
    return panel
  }

  const createSwiperForPanel = (panel: HTMLElement): void => {
    const swiperEl = findOneElement(panel, '.swiper')
    if (!swiperEl) {
      return
    }

    const a11yContext = findOneElement(
      section,
      '.js-featured-collection-a11y-context'
    )
    const prevSlideMessage =
      a11yContext?.dataset.a11yPrevSlide?.trim() || 'Previous slide'
    const nextSlideMessage =
      a11yContext?.dataset.a11yNextSlide?.trim() || 'Next slide'

    // Clean up previous resources for this panel if they exist
    const existingResources = panelResources.get(panel)
    if (existingResources) {
      if (existingResources.focusinListener) {
        existingResources.focusinListener.remove()
      }
    }

    // Destroy previous Swiper instance if it exists
    if (swiper !== null) {
      swiper.destroy(true, true)
      swiper = null
    }

    const paginationEl = findOneElement(panel, '.swiper-pagination')

    const swiperModules: SwiperModule[] = [Navigation, A11y]
    if (paginationEl) {
      swiperModules.push(Pagination)
    }

    const settings: SwiperOptions = {
      modules: swiperModules,
      a11y: {
        enabled: true,
        prevSlideMessage,
        nextSlideMessage
      },
      slidesPerView: 1.2,
      spaceBetween: 16,
      slidesOffsetAfter: 16,
      freeMode: false,
      centeredSlides: false,
      navigation: {
        nextEl: globalNextBtn,
        prevEl: globalPrevBtn
      },
      breakpoints: {
        1024: {
          slidesPerView: 3,
          slidesOffsetAfter: 0,
          freeMode: true,
          pagination: false
        }
      }
    }

    if (paginationEl) {
      settings.pagination = {
        el: paginationEl,
        clickable: true
      }
    }

    swiper = new Swiper(swiperEl, settings)
    swiper.update()
    swiperEl.classList.add('is-visible')

    // Keyboard accessibility
    const focusinListener = namespace.addDirectEventListener(
      panel,
      'focusin',
      (_, e) => {
        if (!swiper) {
          return
        }
        const target = e.target
        if (!(target instanceof HTMLElement)) {
          return
        }
        const slide = target.closest('.swiper-slide')
        if (!(slide instanceof HTMLElement)) {
          return
        }

        const slides = findElements(panel, '.swiper-slide')
        const index = slides.findIndex((el) => el === slide)
        if (index >= 0) {
          swiper.slideTo(index, 0, false)
          swiper.update()
        }
      }
    )

    panelResources.set(panel, {
      focusinListener
    })
  }

  const activateTab = (value: string): void => {
    tabButtons.forEach((btn) => {
      const isActive = btn.getAttribute('data-tab') === value
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false')
    })

    tabPanels.forEach((panel) => {
      const isActive = panel.id === getPanelIdFor(value)
      panel.hidden = !isActive
    })

    // Only create Swiper for the newly active panel
    const panel = getPanelByValue(value)
    if (panel) {
      createSwiperForPanel(panel)
    }

    activeTabValue = value
  }

  // Init with the default active tab/panel (lazy-init only once)
  const initSwiper = (): void => {
    const initial = getSelectedTabValue()
    if (initial) {
      activateTab(initial)
    }

    if (globalNavigation && globalNavigation instanceof HTMLElement) {
      globalNavigation.style.display = 'flex'
    }
  }

  const debouncedInitSwiper = debounce(initSwiper, 100)

  window.addEventListener('resize', debouncedInitSwiper, {
    signal: controller.signal
  })

  initSwiper()

  // Handle tab clicks
  namespace.addDelegatedEventListener(section, '.js-tab', 'click', (button) => {
    const selected = button.getAttribute('data-tab')
    if (!selected) {
      return
    }

    if (activeTabValue && selected === activeTabValue) {
      return
    }

    button.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    })

    activateTab(selected)
  })

  // Keyboard accessibility
  namespace.addDelegatedEventListener(
    section,
    '.js-tab',
    'keydown',
    (button, event) => {
      if (
        event instanceof KeyboardEvent &&
        (event.key === 'Enter' || event.key === ' ')
      ) {
        event.preventDefault()
        const selected = button.getAttribute('data-tab')

        if (!selected) {
          return
        }

        // Return early if tab is already active (same as click handler)
        if (activeTabValue && selected === activeTabValue) {
          return
        }

        activateTab(selected)

        // Focus first slide after activation
        const panel = getPanelByValue(selected)
        if (panel) {
          const firstSlide = findElements(panel, '.swiper-slide a')[0] ?? null
          if (firstSlide) {
            firstSlide.focus()
          }
        }
      }
    }
  )

  return {
    unload: () => {
      // Clean up all panel resources
      panelResources.forEach((resources) => {
        if (resources.focusinListener) {
          resources.focusinListener.remove()
        }
      })
      panelResources.clear()

      controller.abort()

      if (swiper !== null) {
        swiper.destroy(true, true)
        swiper = null
      }
      namespace.destroy()
    }
  }
})
