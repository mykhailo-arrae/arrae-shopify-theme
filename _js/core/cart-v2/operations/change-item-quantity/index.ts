import { postJson } from '../../../network/post-json.js'
import { atShopifyRoot } from '../../../network/shopify-root.js'
import { makeMapNetworkErrorToCartError } from '../../blueprints/operations/map-network-error-to-cart-error.js'
import { makeMapParseErrorToCartError } from '../../blueprints/operations/map-parse-error-to-cart-error.js'
import { ChangeQuantityPayload } from './payload.js'

export const changeItemQuantity = async ({
  payload: _payload,
  signal
}: {
  payload: ChangeQuantityPayload
  signal: AbortSignal
}): Promise<void> => {
  // Parse payload
  const { items } = await ChangeQuantityPayload.parseAsync(_payload).catch(
    makeMapParseErrorToCartError('Invalid change quantity payload')
  )

  for (const { lineItemKey: id, quantity } of items) {
    await postJson({
      url: atShopifyRoot('/cart/change.js'),
      json: { id, quantity },
      options: { signal }
    }).catch(
      makeMapNetworkErrorToCartError({
        userErrorMessage: 'Failed to change item quantities',
        communicationErrorMessage:
          'Network error while changing item quantities'
      })
    )
  }
}
