import {
  findOneElement,
  findOneElementOfType
} from '../../core/dom/traversal/index.js'
import type { ProductCtaState } from '../../core/klaviyo/notify-me-policy.js'

const findButton = findOneElementOfType(HTMLButtonElement)

const SHOW_NOTIFY_ME_CLASS = 'show-notify-me-button'

export type UpdateAtcButtonStateParams = {
  parent: HTMLElement
  state: ProductCtaState
  addToCartLabel: string
  soldOutLabel: string
}

export const getNotifyMeVariantQuantity = (
  parent: HTMLElement,
  variantId: number
): number => {
  const variantSelect = findOneElement(
    parent,
    '.notify-me-popup__variant-select'
  )

  if (!(variantSelect instanceof HTMLSelectElement) || variantId === 0) {
    return 0
  }

  const currentOption = Array.from(variantSelect.options).find(
    (option) => option.value === String(variantId)
  )
  const quantity = Number.parseInt(
    currentOption?.getAttribute('data-variant-qty') ?? '0',
    10
  )

  return Number.isNaN(quantity) ? 0 : quantity
}

export const updateAtcButtonState = ({
  parent,
  state,
  addToCartLabel,
  soldOutLabel
}: UpdateAtcButtonStateParams): void => {
  const atcButton = findButton(parent, '.js-atc-submit-button')
  const atcLabel = findOneElement(parent, '.js-atc-submit-button-label')
  const atcPrices = findOneElement(parent, '.js-atc-submit-button-prices')

  // initSnippet passes the portable-snippet wrapper; CSS scopes to .js-product-details.
  const detailsRoot = parent.matches('.js-product-details')
    ? parent
    : (findOneElement(parent, '.js-product-details') ?? parent)

  detailsRoot.classList.toggle(SHOW_NOTIFY_ME_CLASS, state === 'notify-me')

  if (atcButton == null) {
    return
  }

  if (state === 'sold-out') {
    atcButton.disabled = true
    atcButton.classList.add('is-sold-out')
    if (atcLabel != null) {
      atcLabel.textContent = soldOutLabel
    }
    if (atcPrices != null) {
      atcPrices.hidden = true
    }
    return
  }

  atcButton.disabled = false
  atcButton.classList.remove('is-sold-out')
  if (atcLabel != null) {
    atcLabel.textContent = addToCartLabel
  }
  if (atcPrices != null) {
    atcPrices.hidden = false
  }
}
