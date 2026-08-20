import { postJson } from '../../../network/post-json.js'
import { atShopifyRoot } from '../../../network/shopify-root.js'
import { makeMapNetworkErrorToCartError } from '../../blueprints/operations/map-network-error-to-cart-error.js'

export const clearDiscounts = async ({
  signal
}: {
  signal: AbortSignal
}): Promise<void> => {
  // Clear all discount codes by sending empty string
  await postJson({
    url: atShopifyRoot('/cart/update.js'),
    json: {
      discount: ''
    },
    options: { signal }
  }).catch(
    makeMapNetworkErrorToCartError({
      userErrorMessage: 'Failed to clear discount codes',
      communicationErrorMessage: 'Network error while clearing discount codes'
    })
  )
}
