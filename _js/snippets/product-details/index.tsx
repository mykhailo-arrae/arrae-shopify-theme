import {
  createRawItemPayload,
  type NameValuePair
} from '../../core/cart-v2/create-raw-item-payload.js'
import { initCart } from '../../core/cart-v2/index.js'
import { SingleItemPayload } from '../../core/cart-v2/operations/add-items/payload.js'
import { makeEventNamespace } from '../../core/dom/events/index.js'
import { isHTMLFormElement, isHTMLInputElement } from '../../core/dom/guards.js'
import { findOneElement } from '../../core/dom/traversal/index.js'
import {
  getProductCtaState,
  parseNotifyMeConfigFromElement
} from '../../core/klaviyo/notify-me-policy.js'
import { initMainBus } from '../../core/messaging/main/index.js'
import { formatMoneyTrimmed } from '../../core/shopify/format-money.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'
import type { ProductVariant } from '../../core/shopify/schemas/product-variant.js'
import type { VariantDisplay } from '../product-options/app/io.js'
import { getVariantPrices } from '../product-options/app/variant-display/variant-option-helpers.js'
import { ProductDetailsIO } from './io.js'
import { updateAddressBar } from './update-address-bar.js'
import {
  getNotifyMeVariantQuantity,
  updateAtcButtonState
} from './update-atc-button-state.js'
import { updateAtcButtonPrices } from './update-atc-price.js'

const checkIfValueIsNumber = (value: string): number => {
  const parsedValue =
    typeof value === 'string'
      ? Number.parseInt(value, 10)
      : typeof value === 'number'
        ? value
        : null

  if (parsedValue == null) {
    throw new Error('Quantity is not a number')
  }

  return parsedValue
}

const locale = {
  originalPrice: 'Original price',
  discountedPrice: 'Discounted price',
  soldOutMessage: 'Sold Out'
}

const updateAtcFromVariant = ({
  parent,
  variant,
  sellingPlanGroups,
  moneyFormat,
  display
}: {
  parent: ParentNode
  variant: ProductVariant | null
  sellingPlanGroups: Parameters<
    typeof updateAtcButtonPrices
  >[0]['sellingPlanGroups']
  moneyFormat: string
  display?: Pick<VariantDisplay, 'displayPrice' | 'compareAtPrice'>
}): { displayPriceStr: string; compareAtPrice: number | null } => {
  updateAtcButtonPrices({
    parent,
    variant,
    sellingPlanGroups,
    moneyFormat,
    display
  })

  if (variant == null) {
    return { displayPriceStr: '--', compareAtPrice: null }
  }

  const { displayPrice, compareAtPrice } = getVariantPrices(
    variant,
    sellingPlanGroups,
    display
  )

  return {
    displayPriceStr: formatMoneyTrimmed(displayPrice, moneyFormat),
    compareAtPrice
  }
}

type FacebookPixelWindow = {
  fbq?: (
    action: 'track',
    eventName: 'AddToCart' | 'ViewContent',
    parameters: Record<string, unknown>
  ) => void
} & Window

declare let window: FacebookPixelWindow

initSnippet('product-details', (snippet, section) => {
  const namespace = makeEventNamespace()
  const indicator = findOneElement(snippet, '.js-qty-indicator')
  const input = findOneElement(snippet, 'input[name="quantity"]')

  if (input instanceof HTMLInputElement) {
    const initialQty = checkIfValueIsNumber(input.value)

    if (indicator) {
      indicator.textContent = initialQty.toString()
    }

    namespace.addDelegatedEventListener(
      snippet,
      '.js-product-qty-button',
      'click',
      (trigger, evt) => {
        evt.preventDefault()

        const action = trigger.getAttribute('data-action')
        const currentQty = checkIfValueIsNumber(input.value)
        const updatedQty =
          action === 'plus'
            ? currentQty + 1
            : action === 'minus' && currentQty > 1
              ? currentQty - 1
              : currentQty

        input.value = updatedQty.toString()

        if (indicator) {
          indicator.textContent = updatedQty.toString()
        }
      }
    )
  }

  const mainBus = initMainBus()
  const Cart = initCart()

  const form = findOneElement(snippet, 'form[action^="/cart/add"]')

  if (!isHTMLFormElement(form)) {
    return
  }

  const detailsProductId = Number.parseInt(
    form.getAttribute('data-product-id') ?? '',
    10
  )
  const syncAddressBar = snippet.closest('[data-quickshop]') == null

  const pricePreview = findOneElement(snippet, '.js-price-preview')
  const errorRenderTarget = findOneElement(snippet, '.js-product-form-error')
  const dummyVariantSelector = findOneElement(
    snippet,
    '.js-variant-selector-dummy'
  )
  const rawIo =
    findOneElement(snippet, 'script[type="application/json"]')?.textContent ||
    '{}'

  const { currencyCode, moneyFormat } = ProductDetailsIO.create(
    JSON.parse(rawIo)
  )

  const notifyMeRoot = findOneElement(snippet, '.js-notify-me')
  const atcButton = findOneElement(snippet, '.js-atc-submit-button')
  const addToCartLabel =
    atcButton?.getAttribute('data-add-to-cart-label')?.trim() || 'Add to Cart'

  const notifyButton = findOneElement(snippet, '.js-notify-me-button')

  if (notifyButton instanceof HTMLButtonElement) {
    namespace.addDirectEventListener(notifyButton, 'click', () => {
      if (Number.isNaN(detailsProductId)) {
        return
      }

      mainBus.send({
        name: 'request:open-notify-me',
        details: { productId: detailsProductId },
        source: { type: 'snippet', snippet, section }
      })
    })
  }

  Cart.on('cart:items:added').do(({ details: { items: _items } }) => {
    if (window.fbq == null) {
      return
    }

    const {
      context: { cart: cartSnapshot }
    } = Cart.getSnapshot()

    const items = _items.flatMap((it) => {
      if (cartSnapshot == null) {
        return []
      }

      const match = cartSnapshot.items.find((item) => item.key === it.key)

      return match == null ? [] : [match]
    })

    window.fbq('track', 'AddToCart', {
      content_ids: items.map((item) => item.id),
      content_name: items[0]?.title || 'Product',
      content_type: 'product_group',
      contents: items.map(({ id, quantity }) => ({ id, quantity })),
      currency: currencyCode,
      num_items: items.length,
      value: items.reduce((acc, item) => acc + item.final_line_price, 0) / 100
    })
  })

  const mainBusHandlerRemover = mainBus
    .on('notification:selected-variant')
    .do(
      ({
        details: {
          product,
          selectedVariant: variant,
          displayPrice: resolvedDisplayPrice,
          compareAtPrice: resolvedCompareAtPrice
        }
      }) => {
        // Ignore variant events from other products (e.g. PDP vs quickshop).
        if (
          !Number.isNaN(detailsProductId) &&
          product.id !== detailsProductId
        ) {
          return
        }

        const noPriceIndicator = '--'

        const sellingPlanGroups = product.selling_plan_groups ?? undefined
        const display =
          resolvedDisplayPrice != null
            ? {
                displayPrice: resolvedDisplayPrice,
                compareAtPrice: resolvedCompareAtPrice ?? null
              }
            : undefined
        const { displayPriceStr, compareAtPrice } = updateAtcFromVariant({
          parent: form,
          variant,
          sellingPlanGroups,
          moneyFormat,
          display
        })

        const variantId = variant?.id ?? 0
        const notifyMeConfig = parseNotifyMeConfigFromElement(notifyMeRoot)
        const ctaState = getProductCtaState({
          ...notifyMeConfig,
          variantId,
          variantQuantity: getNotifyMeVariantQuantity(snippet, variantId),
          variantAvailable: variant?.available !== false
        })

        updateAtcButtonState({
          parent: snippet,
          state: ctaState,
          addToCartLabel,
          soldOutLabel: locale.soldOutMessage
        })

        const price =
          variant == null
            ? noPriceIndicator
            : variant.available === false
              ? `
            <s>${displayPriceStr}</s>
            <strong>${locale.soldOutMessage}</strong>
          `
              : compareAtPrice != null
                ? `
              <span class="u-vhide">${locale.discountedPrice}</span>
              ${displayPriceStr}
              <span class="u-vhide">${locale.originalPrice}</span>
              <s>${formatMoneyTrimmed(compareAtPrice, moneyFormat)}</s>
              `
                : displayPriceStr

        if (pricePreview) {
          pricePreview.innerHTML = price
        }

        if (isHTMLInputElement(dummyVariantSelector)) {
          dummyVariantSelector.value = `${variant?.id || ''}`
          dummyVariantSelector.dispatchEvent(new Event('change'))
        }

        if (errorRenderTarget) {
          errorRenderTarget.innerHTML = ''
        }

        if (syncAddressBar) {
          updateAddressBar({
            productHandle: product.handle,
            variantId: variant?.id
          })
        }
      }
    )

  namespace.addDirectEventListener(form, 'submit', (_, evt) => {
    evt.preventDefault()

    const run = async () => {
      const formDataEntries = new FormData(form).entries()

      // TODO Extract this into a core module
      const formDataNameValuePairs: NameValuePair[] = Array.from(
        formDataEntries
      ).reduce(
        // Bun.js/Node.js global types simplify the FormData entry to [string, string] instead of [string, string | File]
        // So we have to treat the value as unknown and narrow it down manually
        (acc: NameValuePair[], [key, value]: [string, unknown]) => {
          if (typeof value !== 'string') {
            return acc
          }

          return [...acc, { name: key, value }]
        },
        []
      )

      const rawItemPayload = createRawItemPayload(formDataNameValuePairs)
      const itemPayloadResult = SingleItemPayload.safeParse(rawItemPayload)

      if (!itemPayloadResult.success) {
        console.warn('Invalid item payload', itemPayloadResult.error)
        throw new Error('Internal error: Invalid item payload')
      }

      if (errorRenderTarget) {
        errorRenderTarget.innerHTML = ''
      }

      const addItemsResult = await Cart.sendAsync({
        type: 'AddItems',
        payload: {
          items: [itemPayloadResult.data]
        }
      })

      if (addItemsResult === 'busy') {
        console.warn('Cannot add item at the moment, try again later')
        return
      }

      mainBus.send({
        name: 'request:open-cart-drawer',
        details: null,
        source: { type: 'global' }
      })
    }

    run().catch((err: unknown) => {
      console.error(err)

      const errMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Unknown error'

      if (errorRenderTarget) {
        errorRenderTarget.textContent = errMessage
      }
    })
  })

  return () => {
    namespace.destroy()
    mainBusHandlerRemover()
  }
})
