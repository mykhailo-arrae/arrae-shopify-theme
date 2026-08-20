import { createRoot } from 'react-dom/client'
import { findOneElement } from '../../core/dom/traversal/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'
import { App } from './app/app.js'
import { ProductOptionsIO } from './app/io.js'

const RENDER_TARGET_SELECTOR = '.js-product-options-render-target'

initSnippet('product-options', (snippet) => {
  const ioContainer = findOneElement(snippet, '.js-product-options-props')
  const renderTarget = findOneElement(snippet, RENDER_TARGET_SELECTOR)
  const {
    product,
    variantDisplay,
    sellingPlanRequired,
    sellingPlanGroups,
    initialVariantId,
    unselectedOptions,
    firstSellingPlanId,
    selectedSellingPlanId,
    sellingPlanSettings,
    hiddenVariantIds,
    subscriptionBenefits,
    optionsLayoutOverride,
    smpSiblingOptions,
    smpSelectorLabel,
    optionValuePrefix,
    bundleOptionDimensions,
    settings
  } = ProductOptionsIO.parse(
    JSON.parse(ioContainer ? ioContainer.textContent || '' : '')
  )

  if (!renderTarget) {
    throw new Error('Render target element not found')
  }

  const formRoot = snippet.closest('form[data-product-id]')
  const atcPriceRoot = formRoot instanceof HTMLElement ? formRoot : renderTarget
  const syncAddressBar = snippet.closest('[data-quickshop]') == null

  const root = createRoot(renderTarget)
  root.render(
    <App
      product={product}
      atcPriceRoot={atcPriceRoot}
      syncAddressBar={syncAddressBar}
      variantDisplay={variantDisplay}
      initialVariantId={initialVariantId}
      unselectedOptions={unselectedOptions}
      settings={settings}
      firstSellingPlanId={firstSellingPlanId}
      selectedSellingPlanId={selectedSellingPlanId}
      sellingPlanRequired={sellingPlanRequired}
      sellingPlanGroups={sellingPlanGroups}
      sellingPlanSettings={sellingPlanSettings}
      hiddenVariantIds={hiddenVariantIds}
      subscriptionBenefits={subscriptionBenefits}
      optionsLayoutOverride={optionsLayoutOverride}
      smpSiblingOptions={smpSiblingOptions}
      smpSelectorLabel={smpSelectorLabel}
      optionValuePrefix={optionValuePrefix}
      bundleOptionDimensions={bundleOptionDimensions}
    />
  )

  return () => {
    if (renderTarget) {
      root.unmount()
    }
  }
})
