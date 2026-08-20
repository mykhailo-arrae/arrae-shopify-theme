import type { ProductVariant } from '../../../../core/shopify/schemas/product-variant.js'
import type {
  OptionValueGroup,
  OptionValueStatus
} from '../modules/filter-options/index.js'
import type { CompositeDisplayContext } from './composite-display.js'
import { extractFlavorDisplayLabel } from './composite-display.js'
import {
  composeCompositeValue,
  parseCompositeValue
} from './parse-composite-value.js'
import {
  getUniqueCompositeParts,
  variantMatchesCompositeValue
} from './resolve-composite-variant.js'

export type BundleFlavorSwatch = {
  value: string
  label: string
  badge: string
  description: string
  imageUrl: string | null
  swatchHex: string | null
  status: OptionValueStatus
}

const getFlavorDisplayLabel = (
  flavor: string,
  displayContext?: CompositeDisplayContext
): string => {
  const label = extractFlavorDisplayLabel(flavor, displayContext)

  return label.length > 0 ? label : flavor
}

const getFlavorStatus = ({
  variants,
  flavor,
  purchaseType,
  optionIndex,
  isSelected
}: {
  variants: Array<Pick<ProductVariant, 'options' | 'available'>>
  flavor: string
  purchaseType: string
  optionIndex: number
  isSelected: boolean
}): OptionValueStatus => {
  if (isSelected) {
    return 'selected'
  }

  const matchingVariants = variants.filter((variant) =>
    variantMatchesCompositeValue(variant, flavor, purchaseType, optionIndex)
  )

  if (matchingVariants.length === 0) {
    return 'unavailable'
  }

  return matchingVariants.some((variant) => variant.available)
    ? 'in-stock'
    : 'out-of-stock'
}

export const buildBundleFlavorSwatches = ({
  variants,
  selectedFlavor,
  selectedPurchaseType,
  optionIndex = 0,
  displayContext
}: {
  variants: Array<Pick<ProductVariant, 'options' | 'available'>>
  selectedFlavor: string
  selectedPurchaseType: string
  optionIndex?: number
  displayContext?: CompositeDisplayContext
}): BundleFlavorSwatch[] => {
  const { flavors } = getUniqueCompositeParts(variants, optionIndex)

  return flavors.map((flavor) => {
    return {
      value: flavor,
      label: getFlavorDisplayLabel(flavor, displayContext),
      badge: '',
      description: '',
      imageUrl: null,
      swatchHex: null,
      status: getFlavorStatus({
        variants,
        flavor,
        purchaseType: selectedPurchaseType,
        optionIndex,
        isSelected: flavor === selectedFlavor
      })
    }
  })
}

export const buildBundlePurchaseTypeGroup = ({
  variants,
  selectedFlavor,
  selectedPurchaseType,
  optionIndex = 0
}: {
  variants: Array<Pick<ProductVariant, 'options' | 'available'>>
  selectedFlavor: string
  selectedPurchaseType: string
  optionIndex?: number
}): OptionValueGroup => {
  const purchaseTypes = new Set<string>()

  variants.forEach((variant) => {
    const optionValue = variant.options[optionIndex]

    if (optionValue == null) {
      return
    }

    const parsed = parseCompositeValue(optionValue)

    if (parsed.isComposite && parsed.flavor === selectedFlavor) {
      purchaseTypes.add(parsed.purchaseType)
    }
  })

  return [...purchaseTypes].map((purchaseType) => {
    const compositeValue = composeCompositeValue(selectedFlavor, purchaseType)
    const isSelected = purchaseType === selectedPurchaseType
    const matchingVariants = variants.filter((variant) =>
      variantMatchesCompositeValue(
        variant,
        selectedFlavor,
        purchaseType,
        optionIndex
      )
    )

    if (isSelected) {
      return { name: compositeValue, status: 'selected' }
    }

    if (matchingVariants.length === 0) {
      return { name: compositeValue, status: 'unavailable' }
    }

    if (matchingVariants.some((variant) => variant.available)) {
      return { name: compositeValue, status: 'in-stock' }
    }

    return { name: compositeValue, status: 'out-of-stock' }
  })
}

export const resolvePurchaseTypeForFlavor = ({
  variants,
  flavor,
  preferredPurchaseType,
  optionIndex = 0
}: {
  variants: Array<Pick<ProductVariant, 'options'>>
  flavor: string
  preferredPurchaseType: string
  optionIndex?: number
}): string => {
  const purchaseTypes = variants
    .map((variant) => {
      const optionValue = variant.options[optionIndex]

      if (optionValue == null) {
        return null
      }

      const parsed = parseCompositeValue(optionValue)

      return parsed.isComposite && parsed.flavor === flavor
        ? parsed.purchaseType
        : null
    })
    .filter((value): value is string => value != null)

  const uniquePurchaseTypes = [...new Set(purchaseTypes)]

  if (uniquePurchaseTypes.includes(preferredPurchaseType)) {
    return preferredPurchaseType
  }

  return uniquePurchaseTypes[0] ?? preferredPurchaseType
}
