import type { ProductVariant } from '../../../../core/shopify/schemas/product-variant.js'
import type { BundleOptionDimension } from '../io.js'
import { parseCompositeValue } from './parse-composite-value.js'
import { variantMatchesDimensionTokens } from './resolve-bundle-dimensions.js'

type VariantForBundleInitial = Pick<
  ProductVariant,
  'id' | 'options' | 'available'
>

export type BundleInitialVariantResult = {
  variantId: number | null
  scannedForward: boolean
  hasValidCombination: boolean
}

const getPurchaseType = (optionValue: string | undefined): string | null => {
  if (optionValue == null) {
    return null
  }

  const parsed = parseCompositeValue(optionValue)

  return parsed.isComposite ? parsed.purchaseType : optionValue
}

/**
 * @description
 * Builds every token combination across the configured dimensions in
 * metaobject order, with earlier rows treated as most significant so the first
 * option of each row is preferred (e.g. `[d0o0, d1o0]`, `[d0o0, d1o1]`, ...).
 */
const buildTokenCombinations = (
  dimensions: BundleOptionDimension[]
): string[][] => {
  return dimensions.reduce<string[][]>(
    (combinations, dimension) => {
      const next: string[][] = []

      for (const combination of combinations) {
        for (const option of dimension.options) {
          next.push([...combination, option.matchToken])
        }
      }

      return next
    },
    [[]]
  )
}

/**
 * @description
 * For a token combination, selects the preferred variant using the same
 * purchase-type priority as simple products: largest subscription first, OTP
 * last (achieved by reversing variant purchase-type order). Prefers an
 * available variant; if none is available, returns the preferred out-of-stock
 * variant so CTA/notify-me state can reflect it.
 */
const getPreferredVariantForTokens = (
  variants: VariantForBundleInitial[],
  dimensions: BundleOptionDimension[],
  tokens: string[],
  optionValuePrefix: string | null,
  optionIndex: number
): VariantForBundleInitial | undefined => {
  const matching = variants.filter((variant) =>
    variantMatchesDimensionTokens(
      variant,
      dimensions,
      tokens,
      null,
      optionIndex,
      optionValuePrefix
    )
  )

  if (matching.length === 0) {
    return undefined
  }

  const purchaseTypes: string[] = []

  for (const variant of matching) {
    const purchaseType = getPurchaseType(variant.options[optionIndex])

    if (purchaseType != null && !purchaseTypes.includes(purchaseType)) {
      purchaseTypes.push(purchaseType)
    }
  }

  const reversedPurchaseTypes = [...purchaseTypes].reverse()

  const preferredPurchaseType =
    reversedPurchaseTypes.find((purchaseType) =>
      matching.some(
        (variant) =>
          getPurchaseType(variant.options[optionIndex]) === purchaseType &&
          variant.available
      )
    ) ?? reversedPurchaseTypes[0]

  if (preferredPurchaseType == null) {
    return matching.find((variant) => variant.available) ?? matching[0]
  }

  const withPreferredPurchaseType = matching.filter(
    (variant) =>
      getPurchaseType(variant.options[optionIndex]) === preferredPurchaseType
  )

  return (
    withPreferredPurchaseType.find((variant) => variant.available) ??
    withPreferredPurchaseType[0] ??
    matching[0]
  )
}

/**
 * @description
 * Resolves the initial variant for a canonical bundle v2 PDP load (no
 * `?variant=`). Tries configured option combinations in metaobject order and
 * returns the first that resolves to at least one visible variant, choosing the
 * preferred purchase type within that combination.
 */
export const getBundleInitialVariantId = ({
  variants,
  dimensions,
  optionValuePrefix = null,
  optionIndex = 0
}: {
  variants: VariantForBundleInitial[]
  dimensions: BundleOptionDimension[]
  optionValuePrefix?: string | null
  optionIndex?: number
}): BundleInitialVariantResult => {
  if (dimensions.length === 0) {
    return {
      variantId: null,
      scannedForward: false,
      hasValidCombination: false
    }
  }

  const combinations = buildTokenCombinations(dimensions)

  for (let index = 0; index < combinations.length; index += 1) {
    const combination = combinations[index]

    if (combination == null) {
      continue
    }

    const variant = getPreferredVariantForTokens(
      variants,
      dimensions,
      combination,
      optionValuePrefix,
      optionIndex
    )

    if (variant != null) {
      return {
        variantId: variant.id,
        scannedForward: index > 0,
        hasValidCombination: true
      }
    }
  }

  return { variantId: null, scannedForward: false, hasValidCombination: false }
}
