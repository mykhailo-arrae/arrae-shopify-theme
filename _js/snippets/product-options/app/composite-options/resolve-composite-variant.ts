import type { ProductVariant } from '../../../../core/shopify/schemas/product-variant.js'
import {
  composeCompositeValue,
  parseCompositeValue
} from './parse-composite-value.js'

type VariantWithOptions = Pick<ProductVariant, 'options'>

const normalizeCompositeValue = (value: string): string => {
  const parsed = parseCompositeValue(value)

  if (!parsed.isComposite) {
    return value.trim()
  }

  return composeCompositeValue(parsed.flavor, parsed.purchaseType)
}

export const variantMatchesCompositeValue = (
  variant: VariantWithOptions,
  flavor: string,
  purchaseType: string,
  optionIndex = 0
): boolean => {
  const optionValue = variant.options[optionIndex]

  if (optionValue == null) {
    return false
  }

  const normalizedTarget = normalizeCompositeValue(
    composeCompositeValue(flavor, purchaseType)
  )
  const normalizedOption = normalizeCompositeValue(optionValue)

  return normalizedOption === normalizedTarget
}

export const resolveCompositeVariant = <T extends VariantWithOptions>(
  variants: T[],
  flavor: string,
  purchaseType: string,
  optionIndex = 0
): T | undefined => {
  return variants.find((variant) =>
    variantMatchesCompositeValue(variant, flavor, purchaseType, optionIndex)
  )
}

export const getUniqueCompositeParts = (
  variants: VariantWithOptions[],
  optionIndex = 0
): { flavors: string[]; purchaseTypes: string[] } => {
  const flavors = new Set<string>()
  const purchaseTypes = new Set<string>()

  variants.forEach((variant) => {
    const optionValue = variant.options[optionIndex]

    if (optionValue == null) {
      return
    }

    const parsed = parseCompositeValue(optionValue)

    if (parsed.isComposite) {
      flavors.add(parsed.flavor)
      purchaseTypes.add(parsed.purchaseType)
      return
    }

    purchaseTypes.add(parsed.purchaseType)
  })

  return {
    flavors: [...flavors],
    purchaseTypes: [...purchaseTypes]
  }
}

export const getSelectedFlavorFromOptions = (
  selectedOptionValue: string | null | undefined
): string | null => {
  if (selectedOptionValue == null || selectedOptionValue.trim() === '') {
    return null
  }

  const parsed = parseCompositeValue(selectedOptionValue)

  return parsed.isComposite ? parsed.flavor : null
}
