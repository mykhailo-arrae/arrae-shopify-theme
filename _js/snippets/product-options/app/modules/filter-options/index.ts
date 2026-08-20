/*!
 * Link product option selectors
 */

export type Variant = {
  available: boolean
  options: string[]
}

export type OptionValueStatus =
  | 'selected'
  | 'in-stock'
  | 'out-of-stock'
  | 'unavailable'

export type OptionValueWithStatus = {
  name: string
  status: OptionValueStatus
}

// TODO Move to another file
export type SellingPlanValue = {
  id: number
  name: string
  price_adjustments?:
    | {
        value?: number | null | undefined
        value_type?: 'percentage' | 'fixed_amount' | 'price' | null | undefined
        position?: number | null | undefined
        order_count?: number | null | undefined
      }[]
    | null
    | undefined
}

// TODO Move to another file
export type SellingPlanGroup = SellingPlanValue[]

export type OptionValueGroup = OptionValueWithStatus[]

export type SelectedOptions = Record<string, string | null>

export type Params = {
  optionNames: string[]
  variants: Variant[]
  selectedOptions: SelectedOptions | null
}

export const getOptionValues = (
  variants: Variant[],
  optionNames: string[]
): string[][] =>
  optionNames.map((_, optionIndex) =>
    variants
      .map((variant) => variant.options[optionIndex])
      .filter(function ensurePresence(
        optionValue: unknown
      ): optionValue is string {
        return Boolean(optionValue && typeof optionValue === 'string')
      })
      .filter(function keepUniqueValuesOnly(
        optionValue: string,
        index,
        self
      ): boolean {
        return self.indexOf(optionValue) === index
      })
  )

export const filterProductOptions = ({
  optionNames,
  variants: allVariants,
  selectedOptions: _selectedOptions
}: Params): OptionValueGroup[] => {
  const selectedOptions: (string | null)[] = optionNames.map((name) => {
    return _selectedOptions ? _selectedOptions[name] || null : null
  })

  const allOptionValues = getOptionValues(allVariants, optionNames)

  return allOptionValues.map((rowOptions, rowIndex) => {
    const variants = allVariants.filter((v) => {
      return selectedOptions
        .slice(0, rowIndex)
        .every((selectedOption, selectedOptionIndex) => {
          return selectedOption == null
            ? true
            : v.options[selectedOptionIndex] === selectedOption
        })
    })

    return rowOptions.map((name): OptionValueWithStatus => {
      const isSelected: boolean = selectedOptions[rowIndex] === name

      if (isSelected) {
        return { name, status: 'selected' }
      }

      const availableVariants = variants.filter((v) => {
        return v.options[rowIndex] === name
      })

      if (availableVariants.length === 0) {
        return { name, status: 'unavailable' }
      }

      return {
        name,
        status: availableVariants.some((v) => v.available)
          ? 'in-stock'
          : 'out-of-stock'
      }
    })
  })
}
