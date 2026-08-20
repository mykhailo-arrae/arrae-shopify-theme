import { initCart } from '../../core/cart-v2/index.js'
import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findOneElement } from '../../core/dom/traversal/index.js'
import { initMainBus } from '../../core/messaging/main/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'

const ATC_SELECTOR = '.js-product-upsells-add-to-cart'
const INFO_TRIGGER_SELECTOR = '.js-product-upsells-info-trigger'
const INFO_PANEL_SELECTOR = '.js-product-upsells-info-panel'

initSnippet('product-upsells', (snippet) => {
  const namespace = makeEventNamespace()
  const mainBus = initMainBus()
  const cart = initCart()

  namespace.addDelegatedEventListener(
    snippet,
    ATC_SELECTOR,
    'click',
    (target) => {
      const button = target instanceof HTMLButtonElement ? target : null
      const variantIdAttr = target.getAttribute('data-variant-id')
      const sellingPlanAttr = target.getAttribute('data-selling-plan-id')

      if (!button || button.disabled) {
        return
      }

      if (!variantIdAttr) {
        console.error('[product-upsells] Add to cart: missing variant id')
        return
      }

      const run = async () => {
        button.disabled = true
        button.setAttribute('aria-busy', 'true')

        try {
          const item: {
            id: number
            quantity: number
            selling_plan?: number | null
          } = {
            id: Number(variantIdAttr),
            quantity: 1
          }

          if (sellingPlanAttr != null && sellingPlanAttr !== '') {
            const planId = Number.parseInt(sellingPlanAttr, 10)
            if (!Number.isNaN(planId)) {
              item.selling_plan = planId
            }
          }

          const result = await cart.sendAsync({
            type: 'AddItems',
            payload: {
              items: [item]
            }
          })

          if (result === 'ok') {
            mainBus.send({
              name: 'request:open-cart-drawer',
              details: null,
              source: { type: 'global' }
            })
          } else if (result === 'busy') {
            console.error('[product-upsells] Add to cart: cart is busy')
          }
        } finally {
          button.disabled = false
          button.removeAttribute('aria-busy')
        }
      }

      run().catch((err: unknown) => {
        console.error('[product-upsells] AddItems failed', err)
      })
    }
  )

  namespace.addDelegatedEventListener(
    snippet,
    INFO_TRIGGER_SELECTOR,
    'click',
    (target) => {
      if (!(target instanceof HTMLButtonElement)) {
        return
      }

      const panel = findOneElement(snippet, INFO_PANEL_SELECTOR)
      if (!panel) {
        return
      }

      const isExpanded = target.getAttribute('aria-expanded') === 'true'
      const shouldOpen = !isExpanded

      target.setAttribute('aria-expanded', shouldOpen.toString())

      if (shouldOpen) {
        panel.removeAttribute('hidden')
      } else {
        panel.setAttribute('hidden', '')
      }
    }
  )

  return () => {
    namespace.destroy()
  }
})
