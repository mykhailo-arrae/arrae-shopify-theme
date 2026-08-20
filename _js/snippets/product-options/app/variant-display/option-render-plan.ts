import {
  findPurchaseTypeOptionIndex,
  isPurchaseTypeOption
} from '../variant-display/purchase-type-option.js'

export const getPurchaseTypeOptionName = (optionNames: string[]): string => {
  const purchaseTypeOptionIndex = findPurchaseTypeOptionIndex(optionNames)

  if (purchaseTypeOptionIndex >= 0) {
    return optionNames[purchaseTypeOptionIndex] ?? 'Purchase Type'
  }

  return optionNames[0] ?? 'Purchase Type'
}

export const getSelectedPurchaseTypeValue = ({
  optionNames,
  selectedOptions,
  selectedVariantOptions
}: {
  optionNames: string[]
  selectedOptions: Record<string, string | null> | null
  selectedVariantOptions: string[] | null | undefined
}): string | null => {
  const purchaseTypeOptionIndex = findPurchaseTypeOptionIndex(optionNames)

  if (purchaseTypeOptionIndex < 0) {
    return null
  }

  const purchaseTypeOptionName = optionNames[purchaseTypeOptionIndex]

  if (purchaseTypeOptionName == null) {
    return null
  }

  return (
    selectedOptions?.[purchaseTypeOptionName] ??
    selectedVariantOptions?.[purchaseTypeOptionIndex] ??
    null
  )
}

export const hasPurchaseTypeOption = (optionNames: string[]): boolean => {
  return findPurchaseTypeOptionIndex(optionNames) >= 0
}

export { isPurchaseTypeOption }
