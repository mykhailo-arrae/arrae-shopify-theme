import { postJson } from '../../../network/post-json.js'
import { atShopifyRoot } from '../../../network/shopify-root.js'
import { makeMapNetworkErrorToCartError } from '../../blueprints/operations/map-network-error-to-cart-error.js'
import { makeMapParseErrorToCartError } from '../../blueprints/operations/map-parse-error-to-cart-error.js'
import { ChangePropertiesPayload } from './payload.js'

export const changeItemProperties = async ({
  payload: _payload,
  signal
}: {
  payload: ChangePropertiesPayload
  signal: AbortSignal
}): Promise<void> => {
  // Parse payload
  const { items } = await ChangePropertiesPayload.parseAsync(_payload).catch(
    makeMapParseErrorToCartError('Invalid change properties payload')
  )

  for (const { lineItemKey: id, properties } of items) {
    await postJson({
      url: atShopifyRoot('/cart/change.js'),
      json: { id, properties },
      options: { signal }
    }).catch(
      makeMapNetworkErrorToCartError({
        userErrorMessage: 'Failed to change item properties',
        communicationErrorMessage:
          'Network error while changing item properties'
      })
    )
  }
}
