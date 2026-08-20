import type { ProductVariant } from '../../../../core/shopify/schemas/product-variant.js'
import type { BundleOptionDimension } from '../io.js'
import { stripCompositeFlavorPrefix } from './composite-display.js'
import { parseCompositeValue } from './parse-composite-value.js'

type VariantWithOptions = Pick<ProductVariant, 'options' | 'available'>

const normalize = (value: string): string => value.trim().toLowerCase()

export const getCompositeLeftSegment = (
  optionValue: string,
  optionValuePrefix?: string | null
): string | null => {
  const parsed = parseCompositeValue(optionValue)

  if (!parsed.isComposite) {
    return null
  }

  return stripCompositeFlavorPrefix(parsed.flavor, {
    optionValuePrefix: optionValuePrefix ?? null
  })
}

export const getCompositePurchaseType = (
  optionValue: string
): string | null => {
  const parsed = parseCompositeValue(optionValue)

  if (!parsed.isComposite) {
    return null
  }

  return parsed.purchaseType
}

const findMatchingOptionForLeftSegment = (
  leftSegment: string,
  dimension: BundleOptionDimension
) => {
  const normalizedLeft = normalize(leftSegment)
  const tokenOptions = [...dimension.options]
    .filter((option) => option.matchToken.length > 0)
    .sort((a, b) => b.matchToken.length - a.matchToken.length)

  for (const option of tokenOptions) {
    if (normalizedLeft.includes(normalize(option.matchToken))) {
      return option
    }
  }

  return dimension.options.find((option) => option.isDefault) ?? null
}

export const matchDimensionOptionForLeftSegment =
  findMatchingOptionForLeftSegment

export const resolveTokensFromOptionValue = (
  optionValue: string,
  dimensions: BundleOptionDimension[],
  optionValuePrefix?: string | null
): string[] | null => {
  const leftSegment = getCompositeLeftSegment(optionValue, optionValuePrefix)

  if (leftSegment == null) {
    return null
  }

  const tokens: string[] = []

  for (const dimension of dimensions) {
    const matched = findMatchingOptionForLeftSegment(leftSegment, dimension)

    if (matched == null) {
      return null
    }

    tokens.push(matched.matchToken)
  }

  return tokens
}

export const leftSegmentMatchesDimensionTokens = (
  leftSegment: string,
  dimensions: BundleOptionDimension[],
  selectedTokens: string[]
): boolean => {
  if (dimensions.length !== selectedTokens.length) {
    return false
  }

  for (let index = 0; index < dimensions.length; index += 1) {
    const dimension = dimensions[index]
    const selectedToken = selectedTokens[index]

    if (dimension == null || selectedToken == null) {
      return false
    }

    const option = dimension.options.find(
      (entry) => entry.matchToken === selectedToken
    )

    if (option == null) {
      return false
    }

    if (option.isDefault && selectedToken.length === 0) {
      const hasOtherMatch = dimension.options.some(
        (entry) =>
          !entry.isDefault &&
          entry.matchToken.length > 0 &&
          normalize(leftSegment).includes(normalize(entry.matchToken))
      )

      if (hasOtherMatch) {
        return false
      }

      continue
    }

    if (
      selectedToken.length === 0 ||
      !normalize(leftSegment).includes(normalize(selectedToken))
    ) {
      return false
    }
  }

  return true
}

export const variantMatchesDimensionTokens = (
  variant: VariantWithOptions,
  dimensions: BundleOptionDimension[],
  selectedTokens: string[],
  purchaseType: string | null,
  optionIndex = 0,
  optionValuePrefix?: string | null
): boolean => {
  const optionValue = variant.options[optionIndex]

  if (optionValue == null) {
    return false
  }

  const leftSegment = getCompositeLeftSegment(optionValue, optionValuePrefix)

  if (leftSegment == null) {
    return false
  }

  if (
    purchaseType != null &&
    getCompositePurchaseType(optionValue) !== purchaseType
  ) {
    return false
  }

  return leftSegmentMatchesDimensionTokens(
    leftSegment,
    dimensions,
    selectedTokens
  )
}

export const resolveBundleVariantByTokens = <T extends VariantWithOptions>(
  variants: T[],
  dimensions: BundleOptionDimension[],
  selectedTokens: string[],
  purchaseType: string,
  optionIndex = 0,
  optionValuePrefix?: string | null
): T | undefined => {
  return variants.find((variant) =>
    variantMatchesDimensionTokens(
      variant,
      dimensions,
      selectedTokens,
      purchaseType,
      optionIndex,
      optionValuePrefix
    )
  )
}

export const resolveBundleVariantByTokensPreferringPurchaseType = <
  T extends VariantWithOptions
>(
  variants: T[],
  dimensions: BundleOptionDimension[],
  selectedTokens: string[],
  preferredPurchaseType: string,
  optionIndex = 0,
  optionValuePrefix?: string | null
): T | undefined => {
  const preferred = resolveBundleVariantByTokens(
    variants,
    dimensions,
    selectedTokens,
    preferredPurchaseType,
    optionIndex,
    optionValuePrefix
  )

  if (preferred != null) {
    return preferred
  }

  return variants.find((variant) =>
    variantMatchesDimensionTokens(
      variant,
      dimensions,
      selectedTokens,
      null,
      optionIndex,
      optionValuePrefix
    )
  )
}

export const canUseConfiguredBundleDimensions = (
  selectedOptionValue: string | null | undefined,
  dimensions: BundleOptionDimension[],
  optionValuePrefix?: string | null
): boolean => {
  if (dimensions.length === 0) {
    return false
  }

  // Every configured dimension must have at least one renderable option.
  // When visibility filtering empties a row, bundle v2 cannot compose a valid
  // variant, so we degrade to bundle v1 instead of rendering a broken UI.
  if (dimensions.some((dimension) => dimension.options.length === 0)) {
    return false
  }

  if (selectedOptionValue == null || selectedOptionValue.trim().length === 0) {
    return false
  }

  return (
    resolveTokensFromOptionValue(
      selectedOptionValue,
      dimensions,
      optionValuePrefix
    ) != null
  )
}
