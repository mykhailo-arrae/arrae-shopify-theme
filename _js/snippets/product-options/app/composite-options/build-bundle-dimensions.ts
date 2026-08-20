import type { ProductVariant } from '../../../../core/shopify/schemas/product-variant.js'
import type { BundleOptionDimension } from '../io.js'
import type {
  OptionValueGroup,
  OptionValueStatus
} from '../modules/filter-options/index.js'
import { parseCompositeValue } from './parse-composite-value.js'
import {
  resolveBundleVariantByTokens,
  variantMatchesDimensionTokens
} from './resolve-bundle-dimensions.js'

export type BundleSwatchOption = {
  value: string
  label: string
  badge: string
  description: string
  imageUrl: string | null
  swatchHex: string | null
  status: OptionValueStatus
}

type VariantWithOptions = Pick<ProductVariant, 'options' | 'available'>

const getOptionStatus = ({
  variants,
  dimensions,
  candidateTokens,
  selectedPurchaseType,
  optionIndex,
  optionValuePrefix,
  isSelected
}: {
  variants: VariantWithOptions[]
  dimensions: BundleOptionDimension[]
  candidateTokens: string[]
  selectedPurchaseType: string
  optionIndex: number
  optionValuePrefix?: string | null
  isSelected: boolean
}): OptionValueStatus => {
  if (isSelected) {
    return 'selected'
  }

  const matchingVariants = variants.filter((variant) =>
    variantMatchesDimensionTokens(
      variant,
      dimensions,
      candidateTokens,
      null,
      optionIndex,
      optionValuePrefix
    )
  )

  if (matchingVariants.length === 0) {
    return 'unavailable'
  }

  const inStockForPurchaseType = matchingVariants.some((variant) => {
    if (!variant.available) {
      return false
    }

    return variantMatchesDimensionTokens(
      variant,
      dimensions,
      candidateTokens,
      selectedPurchaseType,
      optionIndex,
      optionValuePrefix
    )
  })

  if (inStockForPurchaseType) {
    return 'in-stock'
  }

  return matchingVariants.some((variant) => variant.available)
    ? 'in-stock'
    : 'out-of-stock'
}

export const buildConfiguredDimensionSwatches = ({
  dimension,
  dimensionIndex,
  dimensions,
  selectedTokens,
  selectedPurchaseType,
  variants,
  optionIndex = 0,
  optionValuePrefix
}: {
  dimension: BundleOptionDimension
  dimensionIndex: number
  dimensions: BundleOptionDimension[]
  selectedTokens: string[]
  selectedPurchaseType: string
  variants: VariantWithOptions[]
  optionIndex?: number
  optionValuePrefix?: string | null
}): BundleSwatchOption[] => {
  return dimension.options.map((option) => {
    const candidateTokens = [...selectedTokens]
    candidateTokens[dimensionIndex] = option.matchToken
    const isSelected = selectedTokens[dimensionIndex] === option.matchToken

    return {
      value: option.matchToken,
      label: option.displayLabel,
      badge: option.badge,
      description: option.description,
      imageUrl: option.imageUrl,
      swatchHex: option.swatchHex,
      status: getOptionStatus({
        variants,
        dimensions,
        candidateTokens,
        selectedPurchaseType,
        optionIndex,
        optionValuePrefix,
        isSelected
      })
    }
  })
}

export const buildConfiguredBundlePurchaseTypeGroup = ({
  variants,
  dimensions,
  selectedTokens,
  selectedPurchaseType,
  optionIndex = 0,
  optionValuePrefix
}: {
  variants: VariantWithOptions[]
  dimensions: BundleOptionDimension[]
  selectedTokens: string[]
  selectedPurchaseType: string
  optionIndex?: number
  optionValuePrefix?: string | null
}): OptionValueGroup => {
  const purchaseTypes = new Set<string>()

  variants.forEach((variant) => {
    const optionValue = variant.options[optionIndex]

    if (optionValue == null) {
      return
    }

    if (
      !variantMatchesDimensionTokens(
        variant,
        dimensions,
        selectedTokens,
        null,
        optionIndex,
        optionValuePrefix
      )
    ) {
      return
    }

    const parsed = parseCompositeValue(optionValue)

    if (parsed.isComposite) {
      purchaseTypes.add(parsed.purchaseType)
    }
  })

  return [...purchaseTypes].map((purchaseType) => {
    const variant = resolveBundleVariantByTokens(
      variants,
      dimensions,
      selectedTokens,
      purchaseType,
      optionIndex,
      optionValuePrefix
    )
    const compositeValue = variant?.options[optionIndex] ?? purchaseType
    const isSelected = purchaseType === selectedPurchaseType

    if (isSelected) {
      return { name: compositeValue, status: 'selected' }
    }

    if (variant == null) {
      return { name: compositeValue, status: 'unavailable' }
    }

    if (variant.available) {
      return { name: compositeValue, status: 'in-stock' }
    }

    return { name: compositeValue, status: 'out-of-stock' }
  })
}

export const resolvePurchaseTypeForDimensionTokens = ({
  variants,
  dimensions,
  selectedTokens,
  preferredPurchaseType,
  optionIndex = 0,
  optionValuePrefix
}: {
  variants: VariantWithOptions[]
  dimensions: BundleOptionDimension[]
  selectedTokens: string[]
  preferredPurchaseType: string
  optionIndex?: number
  optionValuePrefix?: string | null
}): string => {
  const purchaseTypes = variants
    .filter((variant) =>
      variantMatchesDimensionTokens(
        variant,
        dimensions,
        selectedTokens,
        null,
        optionIndex,
        optionValuePrefix
      )
    )
    .map((variant) => {
      const optionValue = variant.options[optionIndex]

      if (optionValue == null) {
        return null
      }

      const parsed = parseCompositeValue(optionValue)

      return parsed.isComposite ? parsed.purchaseType : null
    })
    .filter((value): value is string => value != null)

  const uniquePurchaseTypes = [...new Set(purchaseTypes)]

  if (uniquePurchaseTypes.includes(preferredPurchaseType)) {
    return preferredPurchaseType
  }

  return uniquePurchaseTypes[0] ?? preferredPurchaseType
}
