import { postJson } from '../../../network/post-json.js'
import { atShopifyRoot } from '../../../network/shopify-root.js'
import { makeMapNetworkErrorToCartError } from '../../blueprints/operations/map-network-error-to-cart-error.js'
import { makeMapParseErrorToCartError } from '../../blueprints/operations/map-parse-error-to-cart-error.js'
import { AddNotePayload } from './payload.js'

export const addNote = async ({
  payload,
  signal
}: {
  payload: AddNotePayload
  signal: AbortSignal
}): Promise<void> => {
  // Parse payload
  const { note } = await AddNotePayload.parseAsync(payload).catch(
    makeMapParseErrorToCartError('Invalid update note payload')
  )

  // Update cart note
  await postJson({
    url: atShopifyRoot('/cart/update.js'),
    json: { note },
    options: { signal }
  }).catch(
    makeMapNetworkErrorToCartError({
      userErrorMessage: 'Failed to update cart note',
      communicationErrorMessage: 'Network error while updating cart note'
    })
  )
}
