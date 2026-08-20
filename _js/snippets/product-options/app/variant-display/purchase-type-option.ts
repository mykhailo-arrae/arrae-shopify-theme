export const PURCHASE_TYPE_OPTION_NAME = 'Purchase Type'

export const isPurchaseTypeOption = (optionName: string): boolean => {
  return (
    optionName.trim().toLowerCase() === PURCHASE_TYPE_OPTION_NAME.toLowerCase()
  )
}

export const findPurchaseTypeOptionIndex = (optionNames: string[]): number => {
  return optionNames.findIndex((name) => isPurchaseTypeOption(name))
}

export const partitionOptionNames = (
  optionNames: string[]
): {
  plainOptionIndices: number[]
  purchaseTypeOptionIndices: number[]
} => {
  const plainOptionIndices: number[] = []
  const purchaseTypeOptionIndices: number[] = []

  optionNames.forEach((name, index) => {
    if (isPurchaseTypeOption(name)) {
      purchaseTypeOptionIndices.push(index)
    } else {
      plainOptionIndices.push(index)
    }
  })

  return { plainOptionIndices, purchaseTypeOptionIndices }
}
