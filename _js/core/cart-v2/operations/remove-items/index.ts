import { postJson } from '../../../network/post-json.js'
import { atShopifyRoot } from '../../../network/shopify-root.js'
import { makeMapNetworkErrorToCartError } from '../../blueprints/operations/map-network-error-to-cart-error.js'
import { makeMapParseErrorToCartError } from '../../blueprints/operations/map-parse-error-to-cart-error.js'
import { RemoveItemsPayload } from './payload.js'

export const removeItems = async ({
  payload: _payload,
  signal
}: {
  payload: RemoveItemsPayload
  signal: AbortSignal
}): Promise<void> => {
  // Parse payload
  const { lineItemKeys } = await RemoveItemsPayload.parseAsync(_payload).catch(
    makeMapParseErrorToCartError('Invalid remove items payload')
  )

  for (const lineItemKey of lineItemKeys) {
    await postJson({
      url: atShopifyRoot('/cart/change.js'),
      json: { id: lineItemKey, quantity: 0 },
      options: { signal }
    }).catch(
      makeMapNetworkErrorToCartError({
        userErrorMessage: 'Failed to remove items from cart',
        communicationErrorMessage:
          'Network error while removing items from cart'
      })
    )
  }
}
