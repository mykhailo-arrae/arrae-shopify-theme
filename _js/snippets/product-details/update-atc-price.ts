import { formatMoneyTrimmed } from '../../core/shopify/format-money.js'
import type { SellingPlansGroup } from '../../core/shopify/schemas/product.js'
import type { ProductVariant } from '../../core/shopify/schemas/product-variant.js'
import type { VariantDisplay } from '../product-options/app/io.js'
import { getVariantPrices } from '../product-options/app/variant-display/variant-option-helpers.js'

export type UpdateAtcPriceParams = {
  /** Scope price updates to this buy box (avoids PDP ↔ quickshop cross-talk). */
  parent: ParentNode
  variant: ProductVariant | null
  sellingPlanGroups: SellingPlansGroup | undefined
  moneyFormat: string
  display?: Pick<VariantDisplay, 'displayPrice' | 'compareAtPrice'>
}

export const updateAtcButtonPrices = ({
  parent,
  variant,
  sellingPlanGroups,
  moneyFormat,
  display
}: UpdateAtcPriceParams): void => {
  const atcPrice = parent.querySelector('.js-atc-price')
  const atcCompareAt = parent.querySelector('.js-atc-compare-at')

  if (!(atcPrice instanceof HTMLElement)) {
    return
  }

  if (variant == null) {
    atcPrice.textContent = '--'

    if (atcCompareAt instanceof HTMLElement) {
      atcCompareAt.textContent = ''
      atcCompareAt.hidden = true
    }

    return
  }

  const { displayPrice, compareAtPrice } = getVariantPrices(
    variant,
    sellingPlanGroups,
    display
  )

  atcPrice.textContent = formatMoneyTrimmed(displayPrice, moneyFormat)

  if (atcCompareAt instanceof HTMLElement) {
    if (compareAtPrice != null && variant.available !== false) {
      atcCompareAt.textContent = formatMoneyTrimmed(compareAtPrice, moneyFormat)
      atcCompareAt.hidden = false
    } else {
      atcCompareAt.textContent = ''
      atcCompareAt.hidden = true
    }
  }
}
