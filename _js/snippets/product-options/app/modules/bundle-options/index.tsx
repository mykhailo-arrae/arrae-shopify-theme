import type { FC } from 'react'
import { useEffect, useMemo } from 'react'
import { getLocaleString } from '../../../../../core/shopify/get-locale-string.js'
import type { SellingPlansGroup } from '../../../../../core/shopify/schemas/product.js'
import type { ProductVariant } from '../../../../../core/shopify/schemas/product-variant.js'
import {
  buildConfiguredBundlePurchaseTypeGroup,
  buildConfiguredDimensionSwatches,
  resolvePurchaseTypeForDimensionTokens
} from '../../composite-options/build-bundle-dimensions.js'
import {
  buildBundleFlavorSwatches,
  buildBundlePurchaseTypeGroup,
  resolvePurchaseTypeForFlavor
} from '../../composite-options/build-bundle-options.js'
import { filterRenderableBundleDimensions } from '../../composite-options/filter-bundle-dimensions.js'
import {
  composeCompositeValue,
  parseCompositeValue
} from '../../composite-options/parse-composite-value.js'
import {
  canUseConfiguredBundleDimensions,
  resolveBundleVariantByTokensPreferringPurchaseType,
  resolveTokensFromOptionValue
} from '../../composite-options/resolve-bundle-dimensions.js'
import { getBundleInitialVariantId } from '../../composite-options/resolve-bundle-initial-variant.js'
import type { BundleVisibilityIssue } from '../../composite-options/validate-bundle-dimensions.js'
import {
  logBundleDimensionValidationIssues,
  logBundleVisibilityIssues,
  validateBundleDimensionConfig
} from '../../composite-options/validate-bundle-dimensions.js'
import type { BundleOptionDimension, VariantDisplay } from '../../io.js'
import { ProductOptionsAsEnrichedRadios } from '../as-enriched-radios/index.js'
import { ProductOptionsAsSwatch } from '../as-swatch/index.js'
import type { Action } from '../select-variant/index.js'

export type Props = {
  optionName: string
  variants: ProductVariant[]
  variantDisplay: VariantDisplay[]
  bundleOptionDimensions: BundleOptionDimension[]
  selectedOptionValue: string | null
  sellingPlanGroups?: SellingPlansGroup
  subscriptionBenefits?: string | null
  moneyFormat: string
  dispatch: (action: Action) => void
  focusedOptionIndex: number
  focusOnIndex: (index: number) => void
  productTitle: string
  optionValuePrefix?: string | null
}

export const BundleOptions: FC<Props> = ({
  optionName,
  variants,
  variantDisplay,
  bundleOptionDimensions,
  selectedOptionValue,
  sellingPlanGroups,
  subscriptionBenefits,
  moneyFormat,
  dispatch,
  focusedOptionIndex,
  focusOnIndex,
  productTitle,
  optionValuePrefix = null
}) => {
  const displayContext = useMemo(
    () => ({
      productTitle,
      optionValuePrefix
    }),
    [optionValuePrefix, productTitle]
  )

  const filteredDimensionsResult = useMemo(
    () =>
      filterRenderableBundleDimensions({
        variants,
        dimensions: bundleOptionDimensions,
        optionValuePrefix
      }),
    [bundleOptionDimensions, optionValuePrefix, variants]
  )

  // Configured bundle metaobjects are the global "ideal" option map; the
  // rendered rows are the subset that maps to currently visible variants.
  const configuredDimensions = filteredDimensionsResult.dimensions

  const useConfiguredDimensions = useMemo(
    () =>
      canUseConfiguredBundleDimensions(
        selectedOptionValue,
        configuredDimensions,
        optionValuePrefix
      ),
    [optionValuePrefix, selectedOptionValue, configuredDimensions]
  )

  useEffect(() => {
    if (bundleOptionDimensions.length === 0) {
      return
    }

    const configIssues = validateBundleDimensionConfig({
      variants,
      dimensions: bundleOptionDimensions,
      optionValuePrefix
    })

    logBundleDimensionValidationIssues(productTitle, configIssues)

    const visibilityIssues: BundleVisibilityIssue[] = []

    filteredDimensionsResult.removedOptions.forEach(
      ({ rowLabel, displayLabel }) => {
        visibilityIssues.push({
          type: 'option_hidden',
          message: `Option "${displayLabel}" in row "${rowLabel}" is hidden (no visible / in-market variant).`
        })
      }
    )

    filteredDimensionsResult.emptyRowLabels.forEach((rowLabel) => {
      visibilityIssues.push({
        type: 'empty_dimension_row',
        message: `Dimension row "${rowLabel}" has no renderable options after visibility filtering; bundle v2 will degrade to v1.`
      })
    })

    // Only a resolved selection that cannot be used is a real degradation.
    // Before the reducer's Init runs, `selectedOptionValue` is transiently
    // null, which would otherwise log a false-positive degradation notice.
    const hasResolvedSelection =
      selectedOptionValue != null && selectedOptionValue.trim().length > 0

    if (hasResolvedSelection && !useConfiguredDimensions) {
      visibilityIssues.push({
        type: 'degraded_to_v1',
        message:
          'Configured bundle dimensions present but not usable; falling back to bundle v1 single swatch row.'
      })
    } else if (useConfiguredDimensions) {
      const initial = getBundleInitialVariantId({
        variants,
        dimensions: configuredDimensions,
        optionValuePrefix
      })

      if (!initial.hasValidCombination) {
        visibilityIssues.push({
          type: 'no_valid_combination',
          message:
            'No configured option combination resolves to a visible variant.'
        })
      } else if (initial.scannedForward) {
        visibilityIssues.push({
          type: 'scanned_forward',
          message:
            'First configured option combination has no visible variant; selected the next valid combination.'
        })
      }
    }

    logBundleVisibilityIssues(productTitle, visibilityIssues)
  }, [
    bundleOptionDimensions,
    configuredDimensions,
    filteredDimensionsResult,
    optionValuePrefix,
    productTitle,
    selectedOptionValue,
    useConfiguredDimensions,
    variants
  ])

  const parsedSelection = useMemo(
    () => parseCompositeValue(selectedOptionValue ?? ''),
    [selectedOptionValue]
  )

  const selectedFlavor = parsedSelection.flavor
  const selectedPurchaseType = parsedSelection.purchaseType

  const selectedTokens = useMemo(() => {
    if (!useConfiguredDimensions || selectedOptionValue == null) {
      return null
    }

    return resolveTokensFromOptionValue(
      selectedOptionValue,
      configuredDimensions,
      optionValuePrefix
    )
  }, [
    optionValuePrefix,
    selectedOptionValue,
    configuredDimensions,
    useConfiguredDimensions
  ])

  const legacyFlavorOptions = useMemo(
    () =>
      buildBundleFlavorSwatches({
        variants,
        selectedFlavor,
        selectedPurchaseType,
        displayContext
      }),
    [displayContext, selectedFlavor, selectedPurchaseType, variants]
  )

  const legacyPurchaseTypeGroup = useMemo(
    () =>
      buildBundlePurchaseTypeGroup({
        variants,
        selectedFlavor,
        selectedPurchaseType
      }),
    [selectedFlavor, selectedPurchaseType, variants]
  )

  const configuredPurchaseTypeGroup = useMemo(() => {
    if (selectedTokens == null) {
      return []
    }

    return buildConfiguredBundlePurchaseTypeGroup({
      variants,
      dimensions: configuredDimensions,
      selectedTokens,
      selectedPurchaseType,
      optionValuePrefix
    })
  }, [
    optionValuePrefix,
    selectedPurchaseType,
    selectedTokens,
    configuredDimensions,
    variants
  ])

  const legacySwatchTitle = getLocaleString(
    'products.product.product_options.select_flavor_prefix',
    {
      replacements: {
        product: productTitle
      },
      fallback: `Select ${productTitle} Flavour:`
    }
  )

  const handleLegacyFlavorSelect = (flavor: string) => {
    const nextPurchaseType = resolvePurchaseTypeForFlavor({
      variants,
      flavor,
      preferredPurchaseType: selectedPurchaseType
    })

    dispatch({
      type: 'SelectOptions',
      payload: [
        {
          name: optionName,
          value: composeCompositeValue(flavor, nextPurchaseType)
        }
      ]
    })
  }

  const handleConfiguredDimensionSelect = (
    dimensionIndex: number,
    matchToken: string
  ) => {
    if (selectedTokens == null) {
      return
    }

    const nextTokens = [...selectedTokens]
    nextTokens[dimensionIndex] = matchToken

    const nextPurchaseType = resolvePurchaseTypeForDimensionTokens({
      variants,
      dimensions: configuredDimensions,
      selectedTokens: nextTokens,
      preferredPurchaseType: selectedPurchaseType,
      optionValuePrefix
    })

    const variant = resolveBundleVariantByTokensPreferringPurchaseType(
      variants,
      configuredDimensions,
      nextTokens,
      nextPurchaseType,
      0,
      optionValuePrefix
    )

    const optionValue = variant?.options[0]

    if (optionValue == null) {
      return
    }

    dispatch({
      type: 'SelectOptions',
      payload: [
        {
          name: optionName,
          value: optionValue
        }
      ]
    })
  }

  const purchaseTypeGroup = useConfiguredDimensions
    ? configuredPurchaseTypeGroup
    : legacyPurchaseTypeGroup

  return (
    <>
      {useConfiguredDimensions && selectedTokens != null ? (
        configuredDimensions.map((dimension, dimensionIndex) => {
          const swatchOptions = buildConfiguredDimensionSwatches({
            dimension,
            dimensionIndex,
            dimensions: configuredDimensions,
            selectedTokens,
            selectedPurchaseType,
            variants,
            optionValuePrefix
          })

          return (
            <ProductOptionsAsSwatch
              key={`${dimension.rowLabel}-${dimensionIndex}`}
              title={dimension.rowLabel}
              options={swatchOptions}
              selectedValue={selectedTokens[dimensionIndex] ?? ''}
              onSelect={(value) => {
                handleConfiguredDimensionSelect(dimensionIndex, value)
              }}
            />
          )
        })
      ) : (
        <ProductOptionsAsSwatch
          title={legacySwatchTitle}
          options={legacyFlavorOptions}
          selectedValue={selectedFlavor}
          onSelect={handleLegacyFlavorSelect}
        />
      )}
      <ProductOptionsAsEnrichedRadios
        optionNames={[optionName]}
        optionValueGroups={[purchaseTypeGroup]}
        variants={variants}
        variantDisplay={variantDisplay}
        optionsLayout="bundle"
        sellingPlanGroups={sellingPlanGroups}
        subscriptionBenefits={subscriptionBenefits}
        moneyFormat={moneyFormat}
        dispatch={dispatch}
        focusedOptionIndex={focusedOptionIndex}
        focusOnIndex={focusOnIndex}
        selectedOptionValue={selectedOptionValue}
        productTitle={productTitle}
        optionValuePrefix={optionValuePrefix}
      />
    </>
  )
}
