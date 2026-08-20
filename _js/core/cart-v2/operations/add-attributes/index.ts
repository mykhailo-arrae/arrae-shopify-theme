import { postJson } from '../../../network/post-json.js'
import { atShopifyRoot } from '../../../network/shopify-root.js'
import { makeMapNetworkErrorToCartError } from '../../blueprints/operations/map-network-error-to-cart-error.js'
import { makeMapParseErrorToCartError } from '../../blueprints/operations/map-parse-error-to-cart-error.js'
import { AddAttributesPayload } from './payload.js'

export const addAttributes = async ({
  payload,
  signal
}: {
  payload: AddAttributesPayload
  signal: AbortSignal
}): Promise<void> => {
  // Parse payload
  const { attributes } = await AddAttributesPayload.parseAsync(payload).catch(
    makeMapParseErrorToCartError('Invalid add attributes payload')
  )

  // Update cart attributes
  await postJson({
    url: atShopifyRoot('/cart/update.js'),
    json: { attributes },
    options: { signal }
  }).catch(
    makeMapNetworkErrorToCartError({
      userErrorMessage: 'Failed to update cart attributes',
      communicationErrorMessage: 'Network error while updating cart attributes'
    })
  )
}
