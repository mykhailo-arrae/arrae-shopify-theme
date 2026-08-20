import type { CartItem } from '../../../core/cart-v2/blueprints/cart/item.js'
import type { CartItemProperties } from '../../../core/cart-v2/blueprints/cart/item-properties.js'
import {
  type CompositeDisplayContext,
  filterVariantsBySelectedFlavor,
  getFlavorLabelFromOptionValue,
  getPurchaseTypeDisplayLabel
} from '../../product-options/app/composite-options/composite-display.js'
import type {
  CartProductVariant,
  CartProductVariants,
  CartRewardItem
} from './io.js'

/** Line items whose SKU starts with one of these prefixes are ignored for reward spend (same as Progress). */
export const REWARD_SKU_EXCLUDE_PREFIXES = ['PROT'] as const

/** Whether a line contributes to tier spend (progress bar + GWP eligibility). */
export const lineItemCountsTowardRewardSpend = (item: CartItem): boolean => {
  if (REWARD_SKU_EXCLUDE_PREFIXES.some((s) => item.sku?.startsWith(s))) {
    return false
  }

  const props = item.properties
  if (props != null) {
    if ('_is_free_gift' in props) {
      return false
    }

    const rewardId = props._reward_id
    if (
      rewardId !== undefined &&
      rewardId !== null &&
      String(rewardId).trim() !== ''
    ) {
      return false
    }
  }

  return true
}

/**
 * Spend total used for tier thresholds — must stay in sync with {@link Progress}.
 * When `includeDiscountsInRewards` is true, uses `final_line_price` and scales by
 * `cartTotalPrice / itemsSubtotalPrice` so the bar matches post-discount cart totals
 * (e.g. cart-level adjustments). When false, uses `original_line_price` only, **without**
 * that ratio — scaling would re-apply discount effects and defeat pre-discount mode.
 *
 * Tier gift lines (`_reward_id`, `_is_free_gift`) are excluded so a GWP line cannot
 * keep the cart above threshold after paid quantity drops.
 */
export const computeCartTotalForRewards = ({
  cartItems,
  cartTotalPrice,
  itemsSubtotalPrice,
  includeDiscountsInRewards
}: {
  cartItems: CartItem[]
  cartTotalPrice: number
  itemsSubtotalPrice: number
  includeDiscountsInRewards: boolean
}): number => {
  const lineKey = includeDiscountsInRewards
    ? 'final_line_price'
    : 'original_line_price'
  const sumNonExcluded = cartItems.reduce(
    (acc, item) =>
      lineItemCountsTowardRewardSpend(item) ? acc + (item[lineKey] ?? 0) : acc,
    0
  )
  if (includeDiscountsInRewards && itemsSubtotalPrice > 0) {
    return Math.round(sumNonExcluded * (cartTotalPrice / itemsSubtotalPrice))
  }
  return sumNonExcluded
}

export const isTier = (obj: unknown): obj is CartRewardItem => {
  if (!obj || typeof obj !== 'object') {
    return false
  }
  const v: unknown = Reflect.get(obj, 'minimum_value')
  return typeof v === 'number' && !Number.isNaN(v)
}

/** Section threshold is in major units (e.g. 60 for $60.00). Convert to minor units (cents) for comparison with cart total and formatMoney. */
export const getTierValue = (tier: CartRewardItem): number => {
  if (!isTier(tier)) {
    return 0
  }
  return Number(tier.minimum_value) * 100
}

/** Max tiers for spend progress and reward eligibility; theme JSON may list more. */
export const REWARD_TIER_MAX = 3

/**
 * Enabled tiers with valid thresholds, lowest threshold first, capped at
 * {@link REWARD_TIER_MAX}. Shared by Progress and useRewards.
 */
export const getRewardTiersForCart = (
  tiers: CartRewardItem[]
): CartRewardItem[] =>
  tiers
    .filter((tier) => isTier(tier) && tier.enabled)
    .sort((a, b) => getTierValue(a) - getTierValue(b))
    .slice(0, REWARD_TIER_MAX)

/** Numeric id for `_reward_id` line properties; uses theme JSON `id` when present. */
export const getTierRewardId = (tier: CartRewardItem): number => {
  if (typeof tier.id === 'number') {
    return tier.id
  }
  const byHandle: Record<string, number> = {
    free_shipping: 0,
    gwp: 1
  }
  return byHandle[tier.handle] ?? -1
}

export const isFreeGiftProduct = (
  properties: CartItemProperties | null,
  price?: number
): boolean => {
  const hasFreeGiftProperty =
    typeof properties === 'object' &&
    properties !== null &&
    '_is_free_gift' in properties

  const isZeroPrice = price !== undefined && price <= 0

  return hasFreeGiftProperty || isZeroPrice
}

/** Tier gift lines last so paid items stay at the top of the cart list. */
export const sortCartItemsWithFreeGiftsLast = (
  items: CartItem[]
): CartItem[] => {
  const regular: CartItem[] = []
  const gifts: CartItem[] = []

  for (const item of items) {
    if (isFreeGiftProduct(item.properties, item.price)) {
      gifts.push(item)
    } else {
      regular.push(item)
    }
  }

  return [...regular, ...gifts]
}

export const findVariantOption = (
  productVariants: CartProductVariants | null,
  variantId: number
): CartProductVariant | null =>
  productVariants?.variants.find((v) => v.id === variantId) ?? null

const isUsableMarketingCopy = (
  value: string | null | undefined
): value is string => {
  if (value == null) {
    return false
  }
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed !== '&nbsp;'
}

/** Product card image from theme metafields (see product-card snippet). */
export const getLineItemCardImageUrl = (
  productVariants: CartProductVariants | null,
  fallbackUrl: string | null | undefined
): string | undefined => {
  const url = productVariants?.card_image_url
  if (typeof url === 'string' && url.length > 0) {
    return url
  }
  if (typeof fallbackUrl === 'string' && fallbackUrl.length > 0) {
    return fallbackUrl
  }
  return undefined
}

/** Marketing copy below the line item title (see product-card snippet). */
export const getLineItemMarketingCopy = (
  productVariants: CartProductVariants | null
): string | null => {
  const copy = productVariants?.marketing_copy
  return isUsableMarketingCopy(copy) ? copy.trim() : null
}

/** Product sells subscriptions (Recharge / Shopify selling_plan_groups). */
export const productHasSubscriptionPlans = (
  productVariants: CartProductVariants | null
): boolean => productVariants?.has_subscription_plans === true

export const getOneTimeVariant = (
  productVariants: CartProductVariants | null
): CartProductVariant | null =>
  productVariants?.variants.find((v) => !v.has_selling_plan) ?? null

export const getSubscriptionVariants = (
  productVariants: CartProductVariants | null
): CartProductVariant[] =>
  productVariants?.variants.filter((v) => v.has_selling_plan) ?? []

export const getMaxSubscriptionDiscountPercent = (
  productVariants: CartProductVariants | null
): number | null => {
  const percents = getSubscriptionVariants(productVariants)
    .map((v) => v.selling_plan_discount_percent)
    .filter((v): v is number => v != null && !Number.isNaN(v))
  if (percents.length === 0) {
    return null
  }
  return Math.max(...percents)
}

export const formatVariantDiscountLabel = (
  variant: CartProductVariant
): string | null => {
  const percent = variant.selling_plan_discount_percent
  if (percent == null) {
    return null
  }
  return `${percent}% Off`
}

const getCartCompositeDisplayContext = (
  productVariants: CartProductVariants | null
): CompositeDisplayContext => ({
  productTitle: productVariants?.product_title ?? '',
  optionValuePrefix: productVariants?.option_value_prefix ?? null
})

export const parseOptionLabel = (
  label: string,
  productVariants: CartProductVariants | null = null
): string => {
  const context = getCartCompositeDisplayContext(productVariants)
  const parsed = getPurchaseTypeDisplayLabel(label, context)
    .trim()
    .replace('Delivered', '')
    .trim()

  return parsed.length > 0 ? parsed : label
}

export const getLineItemVariantFlavorLabel = (
  variantTitle: string | null | undefined,
  productVariants: CartProductVariants | null
): string | null => {
  if (variantTitle == null || variantTitle.trim() === '') {
    return null
  }

  const context = getCartCompositeDisplayContext(productVariants)

  return getFlavorLabelFromOptionValue(variantTitle, context)
}

export const getCartVariantsForSelectedFlavor = (
  variants: CartProductVariant[],
  selectedTitle: string | null | undefined
): CartProductVariant[] =>
  filterVariantsBySelectedFlavor(variants, selectedTitle)

/**
 * Show selector only when the product has subscription plans and at least
 * one-time + one subscription purchase option.
 */
export const lineItemHasVariantSelector = (
  productVariants: CartProductVariants | null
): boolean => {
  if (!productHasSubscriptionPlans(productVariants)) {
    return false
  }
  const oneTime = getOneTimeVariant(productVariants)
  const subscriptions = getSubscriptionVariants(productVariants)
  return oneTime != null && subscriptions.length > 0
}

/**
 * Hide quantity only on subscription delivery variants for products that sell
 * subscriptions. OTP-only products (no `has_subscription_plans`) always show qty.
 */
export const lineItemHidesQuantity = (
  item: CartItem,
  productVariants: CartProductVariants | null
): boolean => {
  if (!productHasSubscriptionPlans(productVariants)) {
    return false
  }

  const variant = findVariantOption(productVariants, item.variant_id)
  return variant?.has_selling_plan === true
}

/** Quantity is always 1 when switching to a subscription variant. */
export const quantityForVariantChange = (
  targetVariant: CartProductVariant,
  currentQuantity: number
): number => (targetVariant.has_selling_plan ? 1 : currentQuantity)

export type LineItemPriceDisplay = {
  finalCents: number
  compareAtCents: number | null
}

export type CartOrderDiscount = {
  key: string
  title: string
  amountCents: number
}

/** Cart-level / order-wide discounts (matches Shopify checkout "Order discount" rows). */
export const getCartOrderDiscounts = (
  applications: Array<{
    key?: string | null
    title?: string | null
    total_allocated_amount?: number | null
  }>
): CartOrderDiscount[] =>
  applications
    .filter((application) => (application.total_allocated_amount ?? 0) > 0)
    .map((application, index) => ({
      key: application.key ?? `order-discount-${index}`,
      title: application.title?.trim() ?? '',
      amountCents: application.total_allocated_amount ?? 0
    }))

/**
 * Stable fingerprint for cart-driven UI (line prices, rewards, broadcasts).
 * Must include discount-related fields, not only quantity.
 */
export const getCartSyncFingerprint = (
  cartItems: CartItem[],
  totalPrice?: number,
  orderDiscounts: CartOrderDiscount[] = []
): string => {
  const lines = cartItems
    .map((item) => `${item.key}:${item.quantity}:${item.final_line_price}`)
    .sort()
    .join('|')

  const discounts = orderDiscounts
    .map((discount) => `${discount.key}:${discount.amountCents}`)
    .join(',')

  return `${lines}|total:${totalPrice ?? 0}|discounts:${discounts}`
}

/** True when the line has its own allocation, not only a cart-level code. */
export const lineItemHasLineLevelDiscount = (item: CartItem): boolean =>
  item.line_level_discount_allocations.length > 0 ||
  item.final_line_price < item.original_line_price

/** Line totals for cart drawer price (qty-aware). Uses cart line fields only. */
export const getLineItemPriceDisplay = (
  item: CartItem
): LineItemPriceDisplay => {
  const finalCents = item.final_line_price
  const qty = Math.max(item.quantity, 1)
  let compareAtCents: number | null = null

  const considerCompareLine = (lineCents: number) => {
    if (
      lineCents > finalCents &&
      (compareAtCents == null || lineCents > compareAtCents)
    ) {
      compareAtCents = lineCents
    }
  }

  if (item.original_line_price > finalCents) {
    considerCompareLine(item.original_line_price)
  }

  const planCompareUnit = item.selling_plan_allocation?.compare_at_price
  if (planCompareUnit != null) {
    considerCompareLine(planCompareUnit * qty)
  }

  if (item.original_price * qty > finalCents) {
    considerCompareLine(item.original_price * qty)
  }

  return { finalCents, compareAtCents }
}
