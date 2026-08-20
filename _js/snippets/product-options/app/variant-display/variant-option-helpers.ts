import type {
  SellingPlan,
  SellingPlansGroup
} from '../../../../core/shopify/schemas/product.js'
import type { ProductVariant } from '../../../../core/shopify/schemas/product-variant.js'
import type { VariantDisplay } from '../io.js'
import { getOptionValues } from '../modules/filter-options/index.js'

const adjustedPrice = (
  base: number,
  adj?: {
    value?: number | null
    value_type?: 'percentage' | 'fixed_amount' | 'price' | null
  } | null
): number => {
  if (!adj || typeof adj.value !== 'number' || !adj.value_type) {
    return base
  }
  if (adj.value_type === 'percentage') {
    return Math.max(0, base * (1 - adj.value / 100))
  }
  if (adj.value_type === 'fixed_amount') {
    return Math.max(0, base - adj.value)
  }
  if (adj.value_type === 'price') {
    return Math.max(0, adj.value)
  }
  return base
}

export const parseSubscriptionBenefits = (
  benefits: string | null | undefined
): string[] => {
  if (benefits == null || benefits.trim() === '') {
    return []
  }

  return benefits
    .split('|')
    .map((benefit) => benefit.trim())
    .filter((benefit) => benefit.length > 0)
}

export const getPrimaryAllocation = (variant: ProductVariant) => {
  return variant.selling_plan_allocations[0] ?? null
}

export const isSubscriptionVariant = (
  variant: ProductVariant | undefined,
  display: VariantDisplay | undefined
): boolean => {
  if (display?.hasSubscription != null) {
    return display.hasSubscription
  }

  return (variant?.selling_plan_allocations.length ?? 0) > 0
}

const findSellingPlan = (
  planId: number | null | undefined,
  sellingPlanGroups: SellingPlansGroup | undefined
): SellingPlan | null => {
  if (planId == null || sellingPlanGroups == null) {
    return null
  }

  for (const group of sellingPlanGroups) {
    const plan = group.selling_plans.find((entry) => entry.id === planId)

    if (plan != null) {
      return plan
    }
  }

  return null
}

const formatSavingsFromPriceAdjustment = (
  adj?: {
    value?: number | null
    value_type?: 'percentage' | 'fixed_amount' | 'price' | null
  } | null
): string | null => {
  if (adj == null || typeof adj.value !== 'number' || adj.value <= 0) {
    return null
  }

  if (adj.value_type === 'percentage') {
    return `SAVE ${Math.round(adj.value)}%`
  }

  return null
}

export const getSavingsLabel = (
  variant: ProductVariant | undefined,
  display: VariantDisplay | undefined,
  sellingPlanGroups: SellingPlansGroup | undefined
): string | null => {
  const planId =
    display?.sellingPlanId ??
    (variant != null ? getPrimaryAllocation(variant)?.selling_plan?.id : null)

  const plan = findSellingPlan(planId, sellingPlanGroups)
  const percentageAdjustment = plan?.price_adjustments?.find(
    (adjustment) => adjustment.value_type === 'percentage'
  )

  return formatSavingsFromPriceAdjustment(percentageAdjustment)
}

export const getVariantIdFromUrl = (): number | null => {
  const variantParam = new URLSearchParams(window.location.search).get(
    'variant'
  )

  if (variantParam == null) {
    return null
  }

  const parsed = Number.parseInt(variantParam, 10)

  return Number.isNaN(parsed) ? null : parsed
}

type VariantForInitialSelection = {
  id: number
  available: boolean
  options: string[]
}

export const getPreferredInitialVariantId = (
  variants: VariantForInitialSelection[],
  optionNames: string[]
): number | null => {
  const allOptionValues = getOptionValues(variants, optionNames)

  for (
    let optionIndex = 0;
    optionIndex < optionNames.length;
    optionIndex += 1
  ) {
    const rowOptions = allOptionValues[optionIndex]

    if (rowOptions == null || rowOptions.length === 0) {
      continue
    }

    const reversedValues = [...rowOptions].reverse()
    const preferredValue =
      reversedValues.find((value) => {
        return variants.some(
          (variant) =>
            variant.options[optionIndex] === value && variant.available
        )
      }) ?? reversedValues[0]

    if (preferredValue == null) {
      continue
    }

    const variant = variants.find(
      (entry) => entry.options[optionIndex] === preferredValue
    )

    if (variant != null) {
      return variant.id
    }
  }

  return null
}

export const getResolvedInitialVariantId = (
  variants: VariantForInitialSelection[],
  optionNames: string[],
  initialVariantId: number,
  urlVariantId: number | null
): number => {
  if (
    urlVariantId != null &&
    variants.some((variant) => variant.id === urlVariantId)
  ) {
    return urlVariantId
  }

  return getPreferredInitialVariantId(variants, optionNames) ?? initialVariantId
}

export const getVariantPrices = (
  variant: ProductVariant,
  sellingPlanGroups: SellingPlansGroup | undefined,
  display?: Pick<Partial<VariantDisplay>, 'displayPrice' | 'compareAtPrice'>
): { displayPrice: number; compareAtPrice: number | null } => {
  if (display?.displayPrice != null) {
    let compareAtPrice =
      display.compareAtPrice != null &&
      display.compareAtPrice > display.displayPrice
        ? display.compareAtPrice
        : null

    if (compareAtPrice == null && variant.price > display.displayPrice) {
      compareAtPrice = variant.price
    }

    return {
      displayPrice: display.displayPrice,
      compareAtPrice
    }
  }

  const allocation = getPrimaryAllocation(variant)
  const planId = allocation?.selling_plan?.id

  if (planId != null && allocation != null) {
    let displayPrice =
      allocation.price ??
      allocation.per_delivery_price ??
      allocation.price_adjustments?.[0]?.price ??
      null

    if (displayPrice == null && sellingPlanGroups != null) {
      for (const group of sellingPlanGroups) {
        const plan = group.selling_plans.find((entry) => entry.id === planId)

        if (plan != null) {
          displayPrice = adjustedPrice(
            variant.price,
            plan.price_adjustments?.[0]
          )
          break
        }
      }
    }

    const resolvedDisplayPrice = displayPrice ?? variant.price

    let compareAtPrice =
      allocation.compare_at_price ??
      allocation.price_adjustments?.[0]?.compare_at_price ??
      null

    if (compareAtPrice == null && variant.price > resolvedDisplayPrice) {
      compareAtPrice = variant.price
    }

    if (compareAtPrice != null && compareAtPrice <= resolvedDisplayPrice) {
      compareAtPrice = null
    }

    return {
      displayPrice: resolvedDisplayPrice,
      compareAtPrice
    }
  }

  return {
    displayPrice: variant.price,
    compareAtPrice:
      variant.compare_at_price != null &&
      variant.compare_at_price > variant.price
        ? variant.compare_at_price
        : null
  }
}

export const getPricePerServing = (
  displayPrice: number,
  numberOfServings: number | null | undefined
): number | null => {
  if (numberOfServings == null || numberOfServings <= 0) {
    return null
  }

  return displayPrice / numberOfServings
}
