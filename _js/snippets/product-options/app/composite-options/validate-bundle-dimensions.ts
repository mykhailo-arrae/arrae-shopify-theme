import type { ProductVariant } from '../../../../core/shopify/schemas/product-variant.js'
import type { BundleOptionDimension } from '../io.js'
import {
  getCompositeLeftSegment,
  matchDimensionOptionForLeftSegment,
  resolveTokensFromOptionValue
} from './resolve-bundle-dimensions.js'

type VariantWithOptions = Pick<ProductVariant, 'id' | 'options'>

export type BundleDimensionValidationIssue = {
  type: 'unmapped_variant' | 'unused_option' | 'non_composite_variant'
  message: string
}

export const validateBundleDimensionConfig = ({
  variants,
  dimensions,
  optionValuePrefix,
  optionIndex = 0
}: {
  variants: VariantWithOptions[]
  dimensions: BundleOptionDimension[]
  optionValuePrefix?: string | null
  optionIndex?: number
}): BundleDimensionValidationIssue[] => {
  if (dimensions.length === 0) {
    return []
  }

  const issues: BundleDimensionValidationIssue[] = []
  const leftSegments: string[] = []

  for (const variant of variants) {
    const optionValue = variant.options[optionIndex]

    if (optionValue == null || optionValue.trim().length === 0) {
      continue
    }

    const leftSegment = getCompositeLeftSegment(optionValue, optionValuePrefix)

    if (leftSegment == null) {
      issues.push({
        type: 'non_composite_variant',
        message: `Variant ${variant.id} is not pipe-encoded: "${optionValue}"`
      })
      continue
    }

    leftSegments.push(leftSegment)

    if (
      resolveTokensFromOptionValue(
        optionValue,
        dimensions,
        optionValuePrefix
      ) == null
    ) {
      issues.push({
        type: 'unmapped_variant',
        message: `Variant ${variant.id} does not match bundle dimension config: "${optionValue}"`
      })
    }
  }

  dimensions.forEach((dimension) => {
    dimension.options.forEach((option) => {
      if (option.isDefault) {
        return
      }

      if (option.matchToken.trim().length === 0) {
        issues.push({
          type: 'unused_option',
          message: `Dimension "${dimension.rowLabel}" option "${option.displayLabel}" is missing match_token`
        })
        return
      }

      const matchesVariant = leftSegments.some((leftSegment) => {
        const matched = matchDimensionOptionForLeftSegment(
          leftSegment,
          dimension
        )

        return matched?.matchToken === option.matchToken
      })

      if (!matchesVariant) {
        issues.push({
          type: 'unused_option',
          message: `Dimension "${dimension.rowLabel}" option "${option.displayLabel}" (token "${option.matchToken}") does not match any variant`
        })
      }
    })
  })

  return issues
}

export const logBundleDimensionValidationIssues = (
  productTitle: string,
  issues: BundleDimensionValidationIssue[]
): void => {
  if (issues.length === 0) {
    return
  }

  console.error(
    `[product-options] Bundle dimension configuration issues for "${productTitle}" (${issues.length}):`,
    issues
  )
}

export type BundleVisibilityIssue = {
  type:
    | 'option_hidden'
    | 'empty_dimension_row'
    | 'degraded_to_v1'
    | 'scanned_forward'
    | 'no_valid_combination'
  message: string
}

export const logBundleVisibilityIssues = (
  productTitle: string,
  issues: BundleVisibilityIssue[]
): void => {
  if (issues.length === 0) {
    return
  }

  console.warn(
    `[product-options] Bundle visibility notices for "${productTitle}" (${issues.length}):`,
    issues
  )
}
