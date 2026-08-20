import type { ProductVariant } from '../../../../core/shopify/schemas/product-variant.js'
import type { OptionsLayout } from '../io.js'
import { parseCompositeValue } from './parse-composite-value.js'
import {
  getSelectedFlavorFromOptions,
  resolveCompositeVariant
} from './resolve-composite-variant.js'

type VariantWithOptions = Pick<ProductVariant, 'options' | 'id' | 'available'>

export type ResolveOptionValueVariantInput<T extends VariantWithOptions> = {
  variants: T[]
  optionIndex: number
  value: string
  optionsLayout: OptionsLayout
  selectedOptionValue?: string | null
}

export const resolveOptionValueVariant = <T extends VariantWithOptions>({
  variants,
  optionIndex,
  value,
  optionsLayout,
  selectedOptionValue
}: ResolveOptionValueVariantInput<T>): T | undefined => {
  const parsedValue = parseCompositeValue(value)

  if (parsedValue.isComposite) {
    return variants.find((variant) => variant.options[optionIndex] === value)
  }

  if (optionsLayout === 'bundle') {
    const selectedFlavor = getSelectedFlavorFromOptions(selectedOptionValue)

    if (selectedFlavor != null) {
      return resolveCompositeVariant(
        variants,
        selectedFlavor,
        value,
        optionIndex
      )
    }
  }

  return variants.find((variant) => variant.options[optionIndex] === value)
}
