import { postJson } from '../../../network/post-json.js'
import { atShopifyRoot } from '../../../network/shopify-root.js'
import { makeMapNetworkErrorToCartError } from '../../blueprints/operations/map-network-error-to-cart-error.js'

export const clearCart = async ({
  signal
}: {
  signal: AbortSignal
}): Promise<void> => {
  // Clear all items from cart using Shopify's clear endpoint
  await postJson({
    url: atShopifyRoot('/cart/clear.js'),
    json: {},
    options: { signal }
  }).catch(
    makeMapNetworkErrorToCartError({
      userErrorMessage: 'Failed to clear cart',
      communicationErrorMessage: 'Network error while clearing cart'
    })
  )
}
