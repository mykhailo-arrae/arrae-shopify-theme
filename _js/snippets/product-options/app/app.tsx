import { createStoreConfig } from '@xstate/store'
import { useSelector, useStore } from '@xstate/store/react'
import {
  type FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer
} from 'react'
import { initMainBus } from '../../../core/messaging/main/index.js'
import { getLocaleString } from '../../../core/shopify/get-locale-string.js'
import type {
  Product,
  SellingPlansGroup
} from '../../../core/shopify/schemas/product.js'
import { asNonEmptyArray } from '../../../core/typescript/array.js'
import { revealProductFormControls } from '../../product-details/reveal-product-form-controls.js'
import { updateAddressBar } from '../../product-details/update-address-bar.js'
import { updateAtcButtonPrices } from '../../product-details/update-atc-price.js'
import { detectOptionsLayout } from './composite-options/detect-options-layout.js'
import { filterRenderableBundleDimensions } from './composite-options/filter-bundle-dimensions.js'
import { getBundleInitialVariantId } from './composite-options/resolve-bundle-initial-variant.js'
import type {
  BundleOptionDimension,
  FirstSellingPlanId,
  InitialVariantId,
  OptionsLayout,
  SelectedSellingPlanId,
  SellingPlanSettings,
  Settings,
  SmpSiblingOption,
  UnselectedOptions,
  VariantDisplay
} from './io.js'
import { ProductOptionsAsEnrichedRadios } from './modules/as-enriched-radios/index.js'
import { ProductOptionsAsRadios } from './modules/as-radios/index.js'
import { BundleOptions } from './modules/bundle-options/index.js'
import { filterProductOptions } from './modules/filter-options/index.js'
import { selectVariantReducer } from './modules/select-variant/index.js'
import { SmpSiblingLinks } from './modules/smp-sibling-links/index.js'
import styles from './style.module.scss'
import {
  getPurchaseTypeOptionName,
  getSelectedPurchaseTypeValue,
  hasPurchaseTypeOption,
  isPurchaseTypeOption
} from './variant-display/option-render-plan.js'
import {
  getResolvedInitialVariantId,
  getVariantIdFromUrl,
  getVariantPrices
} from './variant-display/variant-option-helpers.js'

const mainBus = initMainBus()

export type Props = {
  product: Product
  /** Buy-box form (or snippet) used to scope ATC price DOM updates. */
  atcPriceRoot: ParentNode
  /** When false (e.g. quickshop), do not rewrite the host page URL. */
  syncAddressBar?: boolean
  variantDisplay?: VariantDisplay[]
  settings: Settings
  initialVariantId: InitialVariantId
  unselectedOptions: UnselectedOptions
  firstSellingPlanId?: FirstSellingPlanId
  selectedSellingPlanId?: SelectedSellingPlanId
  sellingPlanRequired?: boolean
  sellingPlanGroups?: SellingPlansGroup
  sellingPlanSettings?: SellingPlanSettings
  hiddenVariantIds?: number[]
  subscriptionBenefits?: string
  optionsLayoutOverride?: OptionsLayout
  smpSiblingOptions?: SmpSiblingOption[]
  smpSelectorLabel?: string
  optionValuePrefix?: string
  bundleOptionDimensions?: BundleOptionDimension[]
}

const adjustedPrice = (
  base: number,
  adj?: {
    value?: number | null
    value_type?: 'percentage' | 'fixed_amount' | 'price' | null
  } | null
): number => {
  if (!adj || typeof adj.value !== 'number' || !adj.value_type) {
    return base
  }
  if (adj.value_type === 'percentage') {
    return Math.max(0, base * (1 - adj.value / 100))
  }
  if (adj.value_type === 'fixed_amount') {
    return Math.max(0, base - adj.value)
  }
  if (adj.value_type === 'price') {
    return Math.max(0, adj.value)
  }
  return base
}

type StoreContext =
  | {
      __state: 'initial'
      focusedOptionIndex: number
      lastSelectedSellingPlanId: null
      sellingPlanId: null
    }
  | {
      __state: 'ready'
      focusedOptionIndex: number
      lastSelectedSellingPlanId: number | null
      sellingPlanId: number | null
    }

const storeConfig = createStoreConfig({
  context: {
    __state: 'initial',
    focusedOptionIndex: 0,
    lastSelectedSellingPlanId: null,
    sellingPlanId: null
  },
  on: {
    updateSellingPlanId: (
      { focusedOptionIndex, sellingPlanId }: StoreContext,
      evt: { sellingPlanId: number | null }
    ): StoreContext => {
      return {
        __state: 'ready',
        focusedOptionIndex,
        lastSelectedSellingPlanId: sellingPlanId,
        sellingPlanId: evt.sellingPlanId
      }
    },
    focusOnIndex: (
      context: StoreContext,
      evt: { index: number }
    ): StoreContext => {
      if (evt.index === context.focusedOptionIndex) {
        return context
      }
      return {
        ...context,
        focusedOptionIndex: evt.index
      }
    }
  }
})

export const App: FC<Props> = ({
  product,
  atcPriceRoot,
  syncAddressBar = true,
  variantDisplay = [],
  settings,
  initialVariantId,
  unselectedOptions,
  sellingPlanGroups,
  hiddenVariantIds = [],
  subscriptionBenefits = '',
  optionsLayoutOverride = 'simple',
  smpSiblingOptions = [],
  smpSelectorLabel = '',
  optionValuePrefix = '',
  bundleOptionDimensions = []
}) => {
  const sellingPlans = useMemo(() => {
    return sellingPlanGroups
      ? sellingPlanGroups.map(({ selling_plans }) => {
          return selling_plans.map((plan) => ({
            id: plan.id,
            name: plan.name,
            price_adjustments: plan.price_adjustments
          }))
        })
      : []
  }, [sellingPlanGroups])

  const { options: optionNames, title: productTitle } = product

  const visibleVariants = useMemo(() => {
    const filtered = product.variants.filter(
      (variant) => !hiddenVariantIds.includes(variant.id)
    )

    if (filtered.length === 0) {
      return product.variants
    }

    return asNonEmptyArray(filtered)
  }, [product.variants, hiddenVariantIds])

  const visibleVariantDisplay = useMemo(
    () =>
      variantDisplay.filter(
        (entry) => !hiddenVariantIds.includes(entry.variantId)
      ),
    [variantDisplay, hiddenVariantIds]
  )

  const optionsLayout = useMemo(
    () => detectOptionsLayout({ optionsLayoutOverride }),
    [optionsLayoutOverride]
  )

  const resolvedInitialVariantId = useMemo(() => {
    const urlVariantId = getVariantIdFromUrl()

    // An explicit variant in the URL always wins.
    if (
      urlVariantId != null &&
      visibleVariants.some((variant) => variant.id === urlVariantId)
    ) {
      return urlVariantId
    }

    // Canonical bundle v2 load: derive selection from the first renderable
    // option in each configured row, then the preferred purchase type.
    if (optionsLayout === 'bundle' && bundleOptionDimensions.length > 0) {
      const prefix = optionValuePrefix.length > 0 ? optionValuePrefix : null
      const { dimensions: renderableDimensions, hasEmptyRow } =
        filterRenderableBundleDimensions({
          variants: visibleVariants,
          dimensions: bundleOptionDimensions,
          optionValuePrefix: prefix
        })

      if (!hasEmptyRow) {
        const { variantId } = getBundleInitialVariantId({
          variants: visibleVariants,
          dimensions: renderableDimensions,
          optionValuePrefix: prefix
        })

        if (variantId != null) {
          return variantId
        }
      }
    }

    return getResolvedInitialVariantId(
      visibleVariants,
      optionNames,
      initialVariantId,
      urlVariantId
    )
  }, [
    visibleVariants,
    optionNames,
    initialVariantId,
    optionsLayout,
    bundleOptionDimensions,
    optionValuePrefix
  ])

  const variantDisplayById = useMemo(
    () =>
      new Map(visibleVariantDisplay.map((entry) => [entry.variantId, entry])),
    [visibleVariantDisplay]
  )

  const [state, dispatch] = useReducer(selectVariantReducer, {
    name: 'Idle',
    optionNames,
    variants: visibleVariants,
    selectedOptions: null,
    selectedVariantId: null
  })

  useEffect(() => {
    dispatch({
      type: 'Init',
      payload: { initialVariantId: resolvedInitialVariantId, unselectedOptions }
    })
  }, [resolvedInitialVariantId, unselectedOptions])

  useLayoutEffect(() => {
    if (state.name === 'Idle') {
      return
    }

    revealProductFormControls(atcPriceRoot)
  }, [atcPriceRoot, state.name])

  const { selectedVariantId, selectedOptions } = state

  const selectedVariant = useMemo(
    () => visibleVariants.find((v) => v.id === selectedVariantId) ?? null,
    [visibleVariants, selectedVariantId]
  )

  const purchaseTypeOptionName = getPurchaseTypeOptionName(optionNames)
  const selectedOptionValue = getSelectedPurchaseTypeValue({
    optionNames,
    selectedOptions,
    selectedVariantOptions: selectedVariant?.options
  })

  const store = useStore(storeConfig)

  useEffect(() => {
    if (selectedVariantId == null) {
      return
    }

    const display = variantDisplayById.get(selectedVariantId)
    const variant = visibleVariants.find(
      (entry) => entry.id === selectedVariantId
    )
    const nextSellingPlanId =
      display?.sellingPlanId ??
      variant?.selling_plan_allocations[0]?.selling_plan?.id ??
      null

    store.send({
      type: 'updateSellingPlanId',
      sellingPlanId: nextSellingPlanId
    })
  }, [store, selectedVariantId, visibleVariants, variantDisplayById])

  const sellingPlanId = useSelector(store, (s) => s.context.sellingPlanId)
  const lastSelectedSellingPlanId = useSelector(
    store,
    (s) => s.context.lastSelectedSellingPlanId
  )
  const focusedOptionIndex = useSelector(
    store,
    (s) => s.context.focusedOptionIndex
  )

  const focusOnIndex = useCallback(
    (index: number) => {
      store.send({ type: 'focusOnIndex', index })
    },
    [store]
  )

  const sellingPlanAfterPrice: number = useMemo(() => {
    const basePrice = selectedVariant?.price ?? 0

    if (sellingPlanId != null) {
      const selectedPlan =
        sellingPlans[0]?.find((plan) => plan.id === sellingPlanId) ?? null

      return adjustedPrice(basePrice, selectedPlan?.price_adjustments?.[0])
    }

    const lastSelectedPlan =
      sellingPlans[0]?.find((plan) => plan.id === lastSelectedSellingPlanId) ??
      null
    return adjustedPrice(basePrice, lastSelectedPlan?.price_adjustments?.[0])
  }, [
    selectedVariant?.price,
    sellingPlans,
    sellingPlanId,
    lastSelectedSellingPlanId
  ])

  useEffect(() => {
    if (
      state.name === 'Idle' ||
      selectedVariantId == null ||
      selectedVariant == null
    ) {
      return
    }

    const groups = sellingPlanGroups ?? product.selling_plan_groups ?? undefined
    const moneyFormat = settings.moneyFormat ?? '${{amount}}'
    const display = variantDisplayById.get(selectedVariantId)
    const { displayPrice, compareAtPrice } = getVariantPrices(
      selectedVariant,
      groups,
      display
    )

    mainBus.send({
      name: 'notification:selected-variant',
      details: {
        product,
        selectedVariant,
        sellingPlanId: sellingPlanId ?? 0,
        sellingPlanAfterPrice,
        displayPrice,
        compareAtPrice
      },
      source: { type: 'global' }
    })

    if (syncAddressBar) {
      updateAddressBar({
        productHandle: product.handle,
        variantId: selectedVariantId
      })
    }

    updateAtcButtonPrices({
      parent: atcPriceRoot,
      variant: selectedVariant,
      sellingPlanGroups: groups,
      moneyFormat,
      display
    })
  }, [
    atcPriceRoot,
    product,
    selectedVariant,
    selectedVariantId,
    sellingPlanId,
    sellingPlanAfterPrice,
    sellingPlanGroups,
    settings.moneyFormat,
    state.name,
    syncAddressBar,
    variantDisplayById
  ])

  const optionValueGroups = filterProductOptions({
    optionNames,
    selectedOptions,
    variants: visibleVariants
  })

  const enrichedRadiosProps = {
    optionNames,
    optionValueGroups,
    variants: visibleVariants,
    variantDisplay: visibleVariantDisplay,
    sellingPlanGroups:
      sellingPlanGroups ?? product.selling_plan_groups ?? undefined,
    subscriptionBenefits,
    moneyFormat: settings.moneyFormat ?? '${{amount}}',
    dispatch,
    focusedOptionIndex,
    focusOnIndex,
    selectedOptionValue,
    productTitle,
    optionValuePrefix: optionValuePrefix.length > 0 ? optionValuePrefix : null
  }

  const plainRadiosProps = {
    dispatch,
    focusedOptionIndex,
    focusOnIndex
  }

  const renderPlainOption = (optionIndex: number) => {
    const optionName = optionNames[optionIndex]
    const optionGroup = optionValueGroups[optionIndex]

    if (optionName == null || optionGroup == null) {
      return null
    }

    return (
      <ProductOptionsAsRadios
        key={optionName}
        optionNames={[optionName]}
        optionValueGroups={[optionGroup]}
        optionIndexOffset={optionIndex}
        {...plainRadiosProps}
      />
    )
  }

  const renderEnrichedPurchaseTypeOption = (
    optionIndex: number,
    layout: OptionsLayout
  ) => {
    const optionName = optionNames[optionIndex]
    const optionGroup = optionValueGroups[optionIndex]

    if (optionName == null || optionGroup == null) {
      return null
    }

    return (
      <ProductOptionsAsEnrichedRadios
        key={optionName}
        {...enrichedRadiosProps}
        optionNames={[optionName]}
        optionValueGroups={[optionGroup]}
        optionsLayout={layout === 'bundle' ? 'bundle' : 'simple'}
      />
    )
  }

  const renderOrderedOptionGroups = (layout: OptionsLayout) => {
    return optionNames.map((optionName, optionIndex) => {
      if (isPurchaseTypeOption(optionName)) {
        return renderEnrichedPurchaseTypeOption(optionIndex, layout)
      }

      return renderPlainOption(optionIndex)
    })
  }

  const renderOptions = () => {
    if (optionsLayout === 'bundle') {
      if (!hasPurchaseTypeOption(optionNames)) {
        return (
          <ProductOptionsAsRadios
            optionNames={optionNames}
            optionValueGroups={optionValueGroups}
            {...plainRadiosProps}
          />
        )
      }

      return (
        <>
          {optionNames.map((optionName, optionIndex) => {
            if (isPurchaseTypeOption(optionName)) {
              return null
            }

            return renderPlainOption(optionIndex)
          })}
          <BundleOptions
            optionName={purchaseTypeOptionName}
            variants={visibleVariants}
            variantDisplay={visibleVariantDisplay}
            bundleOptionDimensions={bundleOptionDimensions}
            selectedOptionValue={selectedOptionValue}
            sellingPlanGroups={enrichedRadiosProps.sellingPlanGroups}
            subscriptionBenefits={subscriptionBenefits}
            moneyFormat={enrichedRadiosProps.moneyFormat}
            dispatch={dispatch}
            focusedOptionIndex={focusedOptionIndex}
            focusOnIndex={focusOnIndex}
            productTitle={productTitle}
            optionValuePrefix={
              optionValuePrefix.length > 0 ? optionValuePrefix : null
            }
          />
        </>
      )
    }

    if (optionsLayout === 'smp') {
      // Variant pickers only — SMP sibling links are rendered separately so
      // they are never gated by variant count.
      if (visibleVariants.length <= 1) {
        return null
      }

      if (hasPurchaseTypeOption(optionNames)) {
        return renderOrderedOptionGroups('simple')
      }

      return (
        <ProductOptionsAsRadios
          optionNames={optionNames}
          optionValueGroups={optionValueGroups}
          {...plainRadiosProps}
        />
      )
    }

    if (!hasPurchaseTypeOption(optionNames)) {
      return (
        <ProductOptionsAsRadios
          optionNames={optionNames}
          optionValueGroups={optionValueGroups}
          {...plainRadiosProps}
        />
      )
    }

    return renderOrderedOptionGroups('simple')
  }

  // SMP siblings are product-level links; show them for any variant count.
  const showSmpOptions = optionsLayout === 'smp' && smpSiblingOptions.length > 0
  const showVariantOptions = visibleVariants.length > 1
  const showOptions = showSmpOptions || showVariantOptions

  const hasPrecedingOptionRows =
    showSmpOptions ||
    (optionsLayout === 'bundle' && hasPurchaseTypeOption(optionNames))

  const optionsSectionTitle = getLocaleString(
    'products.product.product_options.options_section_title',
    { fallback: 'Start your Routine' }
  )

  return (
    <div className="ProductForm-options" data-options-layout={optionsLayout}>
      {selectedVariant && (
        <input
          name="id"
          type="hidden"
          value={selectedVariant.id}
          data-product-id={product.id}
        />
      )}
      {sellingPlanId != null && (
        <input name="selling_plan" type="hidden" value={sellingPlanId} />
      )}
      {showOptions ? (
        <>
          <header className={styles.sectionHeading}>
            <h5 className={styles.sectionTitle}>{optionsSectionTitle}</h5>
            {hasPrecedingOptionRows ? (
              <hr className={styles.sectionDivider} aria-hidden="true" />
            ) : null}
          </header>
          {showSmpOptions ? (
            <SmpSiblingLinks
              selectorLabel={smpSelectorLabel}
              productTitle={productTitle}
              smpSiblingOptions={smpSiblingOptions}
            />
          ) : null}
          {renderOptions()}
        </>
      ) : null}
    </div>
  )
}
