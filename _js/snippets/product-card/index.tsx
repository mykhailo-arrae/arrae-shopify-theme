import { z } from 'zod'
import { makeEventNamespace } from '../../core/dom/events/index.js'
import { initMainBus } from '../../core/messaging/main/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'

const SmpCardSiblingSchema = z.object({
  productId: z.union([z.number(), z.string()]),
  productUrl: z.string(),
  productHandle: z.string(),
  variantId: z.union([z.number(), z.string()]).nullable().optional(),
  cardUrl: z.string(),
  title: z.string(),
  subtitle: z.string(),
  imageHtml: z.string(),
  hoverImageHtml: z.string(),
  reviewsHtml: z.string(),
  priceHtml: z.string(),
  badgeHtml: z.string(),
  overlayImageHtml: z.string(),
  hideReviews: z.boolean(),
  quickshopLabel: z.string().optional()
})

const SmpCardDataSchema = z.object({
  siblings: z.record(z.string(), SmpCardSiblingSchema)
})

type SmpCardSibling = z.infer<typeof SmpCardSiblingSchema>
type SmpCardData = z.infer<typeof SmpCardDataSchema>

const openQuickshop = (
  mainBus: ReturnType<typeof initMainBus>,
  productUrl: string
): void => {
  mainBus.send({
    name: 'request:open-quickshop-drawer',
    details: { productUrl },
    source: { type: 'global' }
  })
}

const getCardRoot = (from: Element): HTMLElement | null => {
  const root = from.closest('.js-product-card')
  return root instanceof HTMLElement ? root : null
}

const findOptionActiveClass = (swatchesRoot: Element): string | null => {
  for (const swatch of swatchesRoot.querySelectorAll(
    '.js-product-card-smp-swatch'
  )) {
    for (const cls of swatch.classList) {
      if (cls.includes('option--active')) {
        return cls
      }
    }
  }

  return null
}

const setActiveSwatch = (
  card: HTMLElement,
  selected: HTMLButtonElement
): void => {
  const productId = selected.getAttribute('data-product-id')
  if (productId == null || productId === '') {
    return
  }

  // Sync both compact (image) and default (content) swatch rows by product id
  const defaultSwatches = card.querySelector('.js-product-card-smp-swatches')
  const activeClass =
    defaultSwatches instanceof HTMLElement
      ? findOptionActiveClass(defaultSwatches)
      : findOptionActiveClass(card)

  const swatches = card.querySelectorAll('.js-product-card-smp-swatch')

  for (const swatch of swatches) {
    if (!(swatch instanceof HTMLButtonElement)) {
      continue
    }

    const isSelected = swatch.getAttribute('data-product-id') === productId
    if (isSelected) {
      swatch.setAttribute('aria-current', 'true')
      if (activeClass != null) {
        swatch.classList.add(activeClass)
      }
    } else {
      swatch.removeAttribute('aria-current')
      if (activeClass != null) {
        swatch.classList.remove(activeClass)
      }
    }
  }
}

const smpCardDataCache = new WeakMap<HTMLElement, SmpCardData>()

const parseSmpCardData = (card: HTMLElement): SmpCardData | null => {
  const cached = smpCardDataCache.get(card)
  if (cached != null) {
    return cached
  }

  const script = card.querySelector('.js-product-card-smp-data')
  if (!(script instanceof HTMLScriptElement) || script.textContent == null) {
    return null
  }

  try {
    const parsed = SmpCardDataSchema.parse(JSON.parse(script.textContent))
    smpCardDataCache.set(card, parsed)
    return parsed
  } catch (err) {
    console.error('[product-card] Failed to parse SMP card data', err)
    return null
  }
}

const updateQuickshopTarget = (
  card: HTMLElement,
  sibling: Pick<
    SmpCardSibling,
    'productUrl' | 'productHandle' | 'variantId' | 'quickshopLabel'
  >
): void => {
  const button = card.querySelector('.js-product-card-quickshop')
  if (!(button instanceof HTMLButtonElement)) {
    return
  }

  button.setAttribute('data-product-url', sibling.productUrl)
  button.setAttribute('data-product-handle', sibling.productHandle)

  if (sibling.variantId == null || sibling.variantId === '') {
    button.removeAttribute('data-variant-id')
  } else {
    button.setAttribute('data-variant-id', String(sibling.variantId))
  }

  if (sibling.quickshopLabel != null && sibling.quickshopLabel !== '') {
    button.setAttribute('aria-label', sibling.quickshopLabel)
    const label = button.querySelector('.js-product-card-quickshop-label')
    if (label instanceof HTMLElement) {
      label.textContent = sibling.quickshopLabel
    }
  }
}

const applySiblingToCard = (
  card: HTMLElement,
  sibling: SmpCardSibling
): void => {
  updateQuickshopTarget(card, sibling)

  const imageLink = card.querySelector('.js-product-card-image-link')
  if (imageLink instanceof HTMLAnchorElement) {
    imageLink.href = sibling.cardUrl
  }

  const titleLink = card.querySelector('.js-product-card-title-link')
  if (titleLink instanceof HTMLAnchorElement) {
    titleLink.href = sibling.cardUrl
    titleLink.textContent = sibling.title
  }

  const subtitle = card.querySelector('.js-product-card-subtitle')
  if (subtitle instanceof HTMLElement) {
    subtitle.innerHTML = sibling.subtitle
  }

  const image = card.querySelector('.js-product-card-image')
  if (image instanceof HTMLElement) {
    image.innerHTML = sibling.imageHtml
  }

  const hoverImage = card.querySelector('.js-product-card-hover-image')
  if (hoverImage instanceof HTMLElement) {
    hoverImage.innerHTML = sibling.hoverImageHtml
    hoverImage.hidden = sibling.hoverImageHtml.trim() === ''
  }

  const reviews = card.querySelector('.js-product-card-reviews')
  if (reviews instanceof HTMLElement) {
    reviews.innerHTML = sibling.reviewsHtml
    reviews.hidden = sibling.hideReviews || sibling.reviewsHtml.trim() === ''
  }

  const price = card.querySelector('.js-product-card-price')
  if (price instanceof HTMLElement) {
    price.innerHTML = sibling.priceHtml
  }

  const badge = card.querySelector('.js-product-card-badge')
  if (badge instanceof HTMLElement) {
    badge.innerHTML = sibling.badgeHtml
    badge.hidden = sibling.badgeHtml.trim() === ''
  }

  const overlayImage = card.querySelector('.js-product-card-overlay-image')
  if (overlayImage instanceof HTMLElement) {
    const overlayMedia = overlayImage.querySelector(
      '.js-product-card-overlay-image-media'
    )
    if (overlayMedia instanceof HTMLElement) {
      overlayMedia.innerHTML = sibling.overlayImageHtml
    }
    overlayImage.hidden = sibling.overlayImageHtml.trim() === ''
  }
}

const selectSmpSwatch = (
  card: HTMLElement,
  button: HTMLButtonElement
): void => {
  const productId = button.getAttribute('data-product-id')
  const productUrl = button.getAttribute('data-product-url')
  const productHandle = button.getAttribute('data-product-handle')
  const variantId = button.getAttribute('data-variant-id')

  if (productUrl == null || productUrl === '') {
    console.error('[product-card] SMP swatch: missing product URL')
    return
  }

  setActiveSwatch(card, button)

  const data = parseSmpCardData(card)
  if (data != null && productId != null && productId !== '') {
    const sibling = data.siblings[productId]
    if (sibling != null) {
      applySiblingToCard(card, sibling)
      return
    }
  }

  // Fallback: at least retarget quickshop from swatch data attrs (step 2)
  updateQuickshopTarget(card, {
    productUrl,
    productHandle: productHandle ?? '',
    variantId,
    quickshopLabel: undefined
  })
}

initSnippet('product-card', (snippet) => {
  const namespace = makeEventNamespace()
  const mainBus = initMainBus()

  namespace.addDelegatedEventListener(
    snippet,
    '.js-product-card-quickshop',
    'click',
    (target, evt) => {
      evt.preventDefault()

      const button = target instanceof HTMLButtonElement ? target : null
      if (!button || button.disabled) {
        return
      }

      const productUrl = button.getAttribute('data-product-url')
      if (productUrl == null || productUrl === '') {
        console.error('[product-card] Quickshop: missing product URL')
        return
      }

      openQuickshop(mainBus, productUrl)
    }
  )

  // SMP flavor swatch → select sibling on the card (update quickshop + content)
  namespace.addDelegatedEventListener(
    snippet,
    '.js-product-card-smp-swatch',
    'click',
    (target, evt) => {
      evt.preventDefault()
      evt.stopPropagation()

      const button = target instanceof HTMLButtonElement ? target : null
      if (!button || button.disabled) {
        return
      }

      const card = getCardRoot(button)
      if (card == null) {
        console.error('[product-card] SMP swatch: missing card root')
        return
      }

      selectSmpSwatch(card, button)
    }
  )

  return () => {
    namespace.destroy()
  }
})
