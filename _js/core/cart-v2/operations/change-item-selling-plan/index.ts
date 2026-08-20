import { postJson } from '../../../network/post-json.js'
import { atShopifyRoot } from '../../../network/shopify-root.js'
import { makeMapNetworkErrorToCartError } from '../../blueprints/operations/map-network-error-to-cart-error.js'
import { makeMapParseErrorToCartError } from '../../blueprints/operations/map-parse-error-to-cart-error.js'
import { fetchCart } from '../fetch-cart/index.js'
import { ChangeSellingPlanPayload } from './payload.js'

export const changeItemSellingPlan = async ({
  payload: _payload,
  signal
}: {
  payload: ChangeSellingPlanPayload
  signal: AbortSignal
}): Promise<void> => {
  // Parse payload
  const { items } = await ChangeSellingPlanPayload.parseAsync(_payload).catch(
    makeMapParseErrorToCartError('Invalid change selling plan payload')
  )

  // Line position might change after each iteration, so we need to refetch the cart after each action
  let latestCart = await fetchCart({ signal })

  for (const {
    lineItemKey,
    quantity: quantityOverride,
    sellingPlan
  } of items) {
    // Find the line index (1-based) for the given line item key
    const lineIndex = latestCart.items.findIndex(
      (item) => item.key === lineItemKey
    )

    if (lineIndex === -1) {
      // Skip line item if it's not found in cart
      // TODO Log warning
      continue
    }

    const currentItem = latestCart.items[lineIndex]

    if (!currentItem) {
      // Skip line item if it's not found in cart
      // TODO Log warning
      continue
    }

    // Convert to 1-based index as required by Shopify API
    const line = lineIndex + 1

    // Get the current quantity for this line item
    const quantity = quantityOverride ?? currentItem.quantity

    await postJson({
      url: atShopifyRoot('/cart/change.js'),
      json: {
        line,
        selling_plan: sellingPlan,
        quantity
      },
      options: { signal }
    }).catch(
      makeMapNetworkErrorToCartError({
        userErrorMessage: 'Failed to change item selling plan',
        communicationErrorMessage:
          'Network error while changing item selling plan'
      })
    )

    // Refetch the cart to get the latest state after the iteration
    latestCart = await fetchCart({ signal })
  }
}
