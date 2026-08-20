import type { ProductVariant } from '../../../../core/shopify/schemas/product-variant.js'
import type { BundleOptionDimension, BundleOptionValue } from '../io.js'
import {
  getCompositeLeftSegment,
  matchDimensionOptionForLeftSegment
} from './resolve-bundle-dimensions.js'

type VariantWithOptions = Pick<ProductVariant, 'options'>

export type RemovedBundleOption = {
  rowLabel: string
  displayLabel: string
}

export type FilteredBundleDimensionsResult = {
  dimensions: BundleOptionDimension[]
  emptyRowLabels: string[]
  removedOptions: RemovedBundleOption[]
  hasEmptyRow: boolean
}

/**
 * @description
 * Returns the configured options in a dimension that at least one currently
 * visible variant maps to. Visibility here means the variant survived hard
 * filters (e.g. `hide_on_front_end`, market availability) before reaching the
 * app. Out-of-stock variants still count as visible, so out-of-stock options
 * remain renderable.
 */
const getRenderableOptions = (
  variants: VariantWithOptions[],
  dimension: BundleOptionDimension,
  optionValuePrefix?: string | null,
  optionIndex = 0
): BundleOptionValue[] => {
  const renderable = new Set<BundleOptionValue>()

  for (const variant of variants) {
    const optionValue = variant.options[optionIndex]

    if (optionValue == null) {
      continue
    }

    const leftSegment = getCompositeLeftSegment(optionValue, optionValuePrefix)

    if (leftSegment == null) {
      continue
    }

    const matched = matchDimensionOptionForLeftSegment(leftSegment, dimension)

    if (matched != null) {
      renderable.add(matched)
    }
  }

  return dimension.options.filter((option) => renderable.has(option))
}

/**
 * @description
 * Treats the configured bundle metaobject dimensions as the global "ideal"
 * option map and derives the subset that is actually renderable given the
 * currently visible variants. Preserves metaobject dimension and option order.
 */
export const filterRenderableBundleDimensions = ({
  variants,
  dimensions,
  optionValuePrefix,
  optionIndex = 0
}: {
  variants: VariantWithOptions[]
  dimensions: BundleOptionDimension[]
  optionValuePrefix?: string | null
  optionIndex?: number
}): FilteredBundleDimensionsResult => {
  const emptyRowLabels: string[] = []
  const removedOptions: RemovedBundleOption[] = []

  const filteredDimensions = dimensions.map((dimension) => {
    const options = getRenderableOptions(
      variants,
      dimension,
      optionValuePrefix,
      optionIndex
    )

    dimension.options.forEach((option) => {
      if (!options.includes(option)) {
        removedOptions.push({
          rowLabel: dimension.rowLabel,
          displayLabel: option.displayLabel
        })
      }
    })

    if (options.length === 0) {
      emptyRowLabels.push(dimension.rowLabel)
    }

    return { ...dimension, options }
  })

  return {
    dimensions: filteredDimensions,
    emptyRowLabels,
    removedOptions,
    hasEmptyRow: emptyRowLabels.length > 0
  }
}
