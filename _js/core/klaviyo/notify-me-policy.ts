export type NotifyMePolicyInput = {
  enableNotifyMeGlobally: boolean
  notifyMeQuantityTrigger: number
  /** Force notify me for all variants on this product */
  enableNotifyMeLocally: boolean
  /** Enable stock-check notify me for this product only */
  enableOnlyForThisProduct: boolean
  /** Hard-coded local override on the component */
  forceShowLocally: boolean
  /**
   * Variant IDs forced to show notify me (market OOS overrides and/or
   * variant-level `enable_notify_me_locally`).
   */
  disabledVariantIds: number[]
  /**
   * Variant IDs opted into the qty stock-check path via variant-level
   * `enable_notify_me_for_product` when global/product stock-check is off.
   */
  stockCheckVariantIds: number[]
  variantId: number
  variantQuantity: number
}

/**
 * Precedence:
 * 1. Force (product locally OR variant locally / market OOS via disabledVariantIds
 *    OR forceShowLocally) → always show
 * 2. Stock check runs if global OR product enableOnlyForThisProduct OR variant
 *    is in stockCheckVariantIds → show when qty ≤ trigger
 * Product `enableNotifyMeLocally` still forces every variant on the product.
 */
export const shouldShowNotifyMe = ({
  enableNotifyMeGlobally,
  notifyMeQuantityTrigger,
  enableNotifyMeLocally,
  enableOnlyForThisProduct,
  forceShowLocally,
  disabledVariantIds,
  stockCheckVariantIds,
  variantId,
  variantQuantity
}: NotifyMePolicyInput): boolean => {
  if (forceShowLocally || enableNotifyMeLocally) {
    return true
  }

  if (disabledVariantIds.includes(variantId)) {
    return true
  }

  const shouldRunStockCheck =
    enableNotifyMeGlobally ||
    enableOnlyForThisProduct ||
    stockCheckVariantIds.includes(variantId)

  if (!shouldRunStockCheck) {
    return false
  }

  return variantQuantity <= notifyMeQuantityTrigger
}

export type ProductCtaState = 'add-to-cart' | 'notify-me' | 'sold-out'

export type ProductCtaStateInput = NotifyMePolicyInput & {
  variantAvailable: boolean
}

export const getProductCtaState = ({
  variantAvailable,
  ...policyInput
}: ProductCtaStateInput): ProductCtaState => {
  if (shouldShowNotifyMe(policyInput)) {
    return 'notify-me'
  }

  if (variantAvailable === false) {
    return 'sold-out'
  }

  return 'add-to-cart'
}

export type NotifyMeConfig = Omit<
  NotifyMePolicyInput,
  'variantId' | 'variantQuantity'
>

export const parseNotifyMeConfigFromElement = (
  root: HTMLElement | null
): NotifyMeConfig => {
  if (root == null) {
    return {
      enableNotifyMeGlobally: false,
      notifyMeQuantityTrigger: 0,
      enableNotifyMeLocally: false,
      enableOnlyForThisProduct: false,
      forceShowLocally: false,
      disabledVariantIds: [],
      stockCheckVariantIds: []
    }
  }

  return {
    enableNotifyMeGlobally:
      root.getAttribute('data-enable-notify-me-globally') === 'true',
    notifyMeQuantityTrigger:
      Number.parseInt(
        root.getAttribute('data-notify-me-quantity-trigger') ?? '0',
        10
      ) || 0,
    enableNotifyMeLocally:
      root.getAttribute('data-enable-notify-me-locally') === 'true',
    enableOnlyForThisProduct:
      root.getAttribute('data-enable-locally-product') === 'true',
    forceShowLocally: root.getAttribute('data-locally') === 'true',
    disabledVariantIds: parseDisabledVariantIds(
      root.getAttribute('data-disabled-variant-ids')
    ),
    stockCheckVariantIds: parseDisabledVariantIds(
      root.getAttribute('data-stock-check-variant-ids')
    )
  }
}

export const parseDisabledVariantIds = (
  value: string | null | undefined
): number[] => {
  if (value == null || value.trim() === '') {
    return []
  }

  return value
    .split(',')
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((id) => !Number.isNaN(id))
}
