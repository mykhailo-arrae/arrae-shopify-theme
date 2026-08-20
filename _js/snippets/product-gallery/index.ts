import Swiper from 'swiper'
import { A11y, Navigation, Pagination } from 'swiper/modules'
import { findOneElement } from '../../core/dom/traversal/index.js'
import { initMainBus } from '../../core/messaging/main/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'
import type { GalleryImage } from './io.js'
import { ProductGalleryIO } from './io.js'

/** Must match `styles.scss` / `mq.min(tabletlandscape)`. */
const DESKTOP_BREAKPOINT_PX = 1024

const getInitialVariantId = (): number | null => {
  const fromUrl = new URLSearchParams(window.location.search).get('variant')

  if (fromUrl != null) {
    const parsed = Number.parseInt(fromUrl, 10)

    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  const variantInput = document.querySelector<HTMLInputElement>(
    `form[data-product-id] input[name="id"]`
  )

  if (variantInput?.value) {
    const parsed = Number.parseInt(variantInput.value, 10)

    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return null
}

const setImageOnClone = (
  root: ParentNode,
  image: GalleryImage
): HTMLElement | null => {
  const element = root.firstElementChild

  if (!(element instanceof HTMLElement)) {
    return null
  }

  const img = element.querySelector('img')

  if (img instanceof HTMLImageElement) {
    img.src = image.src
    img.alt = image.alt ?? ''
    img.removeAttribute('srcset')
    img.removeAttribute('sizes')
  }

  return element
}

const buildSlidesFromTemplate = (
  template: HTMLTemplateElement,
  images: GalleryImage[]
): DocumentFragment => {
  const fragment = document.createDocumentFragment()

  images.forEach((image) => {
    const clone = template.content.cloneNode(true)

    if (!(clone instanceof DocumentFragment)) {
      return
    }

    const slide = setImageOnClone(clone, image)

    if (slide != null) {
      fragment.appendChild(slide)
    }
  })

  return fragment
}

initSnippet('product-gallery', (snippet) => {
  const carouselEl = findOneElement(snippet, '.js-product-gallery-swiper')
  const globalNavigation = findOneElement(snippet, '.js-nav-arrows')
  const carouselWrapper = findOneElement(carouselEl, '.swiper-wrapper')
  const desktopGallery = findOneElement(snippet, '.js-product-gallery-desktop')
  const paginationEl = findOneElement(snippet, '.swiper-pagination')
  const carouselSlideTemplate = findOneElement(
    snippet,
    '.js-product-gallery-carousel-slide-template'
  )
  const desktopImageTemplate = findOneElement(
    snippet,
    '.js-product-gallery-desktop-image-template'
  )
  const defaultCarouselTemplate = findOneElement(
    snippet,
    '.js-product-gallery-default-carousel'
  )
  const defaultDesktopTemplate = findOneElement(
    snippet,
    '.js-product-gallery-default-desktop'
  )
  const propsEl = findOneElement(snippet, '.js-product-gallery-props')

  if (
    !carouselEl ||
    !carouselWrapper ||
    !desktopGallery ||
    !(carouselSlideTemplate instanceof HTMLTemplateElement) ||
    !(desktopImageTemplate instanceof HTMLTemplateElement) ||
    !propsEl
  ) {
    return
  }

  let parsedProps: unknown

  try {
    parsedProps = JSON.parse(propsEl.textContent ?? '{}')
  } catch (err) {
    console.error('[product-gallery] Invalid gallery props JSON', err)
    return
  }

  const parsedGallery = ProductGalleryIO.safeParse(parsedProps)

  if (!parsedGallery.success) {
    console.error(
      '[product-gallery] Invalid gallery props shape',
      parsedGallery.error
    )
    return
  }

  const galleryConfig = parsedGallery.data
  const forceCarousel = snippet.closest('[data-quickshop]') != null
  const galleryProductIdAttr = findOneElement(
    snippet,
    '[data-product-id]'
  )?.getAttribute('data-product-id')
  const galleryProductId =
    galleryProductIdAttr != null && galleryProductIdAttr !== ''
      ? Number.parseInt(galleryProductIdAttr, 10)
      : null

  // Product-level default markup for restore. When SSR used a variant
  // override, Liquid provides dedicated templates; otherwise the visible DOM
  // is already the product default. Null means rebuild from defaultImages.
  const defaultCarouselMarkup =
    defaultCarouselTemplate instanceof HTMLTemplateElement
      ? defaultCarouselTemplate.innerHTML
      : galleryConfig.initialGalleryKey === 'default'
        ? carouselWrapper.innerHTML
        : null
  const defaultDesktopMarkup =
    defaultDesktopTemplate instanceof HTMLTemplateElement
      ? defaultDesktopTemplate.innerHTML
      : galleryConfig.initialGalleryKey === 'default'
        ? desktopGallery.innerHTML
        : null

  const desktopBreakpoint = window.matchMedia(
    `(min-width: ${DESKTOP_BREAKPOINT_PX}px)`
  )
  const controller = new AbortController()
  const mainBus = initMainBus()

  let swiper: Swiper | null = null
  // Tracks the identity of the gallery currently rendered in the DOM rather
  // than the variant id, so switching between variants that resolve to the
  // same gallery (e.g. both fall back to the default images) is a no-op and
  // doesn't tear down/rebuild the DOM + Swiper. Seeded from SSR.
  let activeGalleryKey: string | null = galleryConfig.initialGalleryKey

  const refreshFeaturedBlocks = (): HTMLElement[] =>
    [...snippet.querySelectorAll('.js-product-gallery-featured')].filter(
      (node): node is HTMLElement => node instanceof HTMLElement
    )

  const setFeaturedVisible = (visible: boolean): void => {
    refreshFeaturedBlocks().forEach((block) => {
      if (visible) {
        block.removeAttribute('hidden')
      } else {
        block.setAttribute('hidden', 'hidden')
      }
    })
  }

  const setMultiImageUiVisible = (visible: boolean): void => {
    if (paginationEl instanceof HTMLElement) {
      paginationEl.style.display = visible ? '' : 'none'
    }

    if (globalNavigation instanceof HTMLElement) {
      globalNavigation.style.display = visible ? 'flex' : 'none'
    }
  }

  const destroyCarousel = (): void => {
    swiper?.destroy(true, true)
    swiper = null

    if (globalNavigation instanceof HTMLElement) {
      globalNavigation.style.display = 'none'
    }
  }

  const initCarousel = (isDesktop: boolean): void => {
    if (isDesktop && !forceCarousel) {
      destroyCarousel()
      return
    }

    const slideCount = carouselWrapper.querySelectorAll('.swiper-slide').length

    if (slideCount === 0) {
      destroyCarousel()
      return
    }

    if (swiper != null) {
      swiper.update()
      swiper.slideTo(0, 0)
      return
    }

    const prevEl = findOneElement(snippet, '.swiper-button-prev')
    const nextEl = findOneElement(snippet, '.swiper-button-next')
    const pagination =
      paginationEl instanceof HTMLElement && slideCount > 1
        ? { el: paginationEl, clickable: true as const }
        : false

    swiper = new Swiper(carouselEl, {
      modules: [A11y, Navigation, Pagination],
      a11y: {
        enabled: true
      },
      watchOverflow: true,
      allowTouchMove: true,
      slidesPerView: 1.2,
      spaceBetween: 16,
      slidesOffsetAfter: 16,
      freeMode: false,
      centeredSlides: false,
      navigation: {
        nextEl,
        prevEl
      },
      pagination
    })

    if (globalNavigation instanceof HTMLElement && slideCount > 1) {
      globalNavigation.style.display = 'flex'
    }
  }

  const handleBreakpointChange = (): void => {
    initCarousel(forceCarousel ? false : desktopBreakpoint.matches)
  }

  const resolveGalleryForVariant = (
    variantId: number | null
  ): { images: GalleryImage[]; isVariantOverride: boolean } => {
    if (variantId == null) {
      return {
        images: galleryConfig.defaultImages,
        isVariantOverride: false
      }
    }

    const override = galleryConfig.variantGalleries[String(variantId)]

    if (override != null && override.length > 0) {
      return { images: override, isVariantOverride: true }
    }

    return {
      images: galleryConfig.defaultImages,
      isVariantOverride: false
    }
  }

  const applyGalleryForVariant = (variantId: number | null): void => {
    const { images, isVariantOverride } = resolveGalleryForVariant(variantId)
    const galleryKey = isVariantOverride ? `variant:${variantId}` : 'default'

    if (galleryKey === activeGalleryKey) {
      return
    }

    activeGalleryKey = galleryKey

    if (!isVariantOverride) {
      if (defaultCarouselMarkup != null && defaultDesktopMarkup != null) {
        carouselWrapper.innerHTML = defaultCarouselMarkup
        desktopGallery.innerHTML = defaultDesktopMarkup
      } else {
        carouselWrapper.replaceChildren(
          buildSlidesFromTemplate(carouselSlideTemplate, images)
        )
        desktopGallery.replaceChildren(
          buildSlidesFromTemplate(desktopImageTemplate, images)
        )
      }
      setFeaturedVisible(true)
    } else {
      carouselWrapper.replaceChildren(
        buildSlidesFromTemplate(carouselSlideTemplate, images)
      )
      desktopGallery.replaceChildren(
        buildSlidesFromTemplate(desktopImageTemplate, images)
      )
      setFeaturedVisible(false)
    }

    setMultiImageUiVisible(images.length > 1)
    destroyCarousel()
    initCarousel(forceCarousel ? false : desktopBreakpoint.matches)
  }

  desktopBreakpoint.addEventListener('change', handleBreakpointChange, {
    signal: controller.signal
  })

  initCarousel(forceCarousel ? false : desktopBreakpoint.matches)

  const busRemover = mainBus
    .on('notification:selected-variant')
    .do(({ details: { selectedVariant, product } }) => {
      // Ignore variant events from other products (e.g. PDP vs quickshop).
      if (
        galleryProductId != null &&
        !Number.isNaN(galleryProductId) &&
        product.id !== galleryProductId
      ) {
        return
      }

      applyGalleryForVariant(selectedVariant?.id ?? null)
    })

  // Only reconcile from URL/form when present. Otherwise trust Liquid SSR
  // (reversed / largest-subscription initial variant), which may not match
  // an empty form input before product-options hydrates.
  // In quickshop, URL/form belong to the host page — trust SSR + bus events.
  if (!forceCarousel) {
    const urlOrFormVariantId = getInitialVariantId()

    if (urlOrFormVariantId != null) {
      applyGalleryForVariant(urlOrFormVariantId)
    }
  }

  return () => {
    controller.abort()
    destroyCarousel()
    busRemover()
  }
})
