import { z } from 'zod'
import { postJson } from '../../../network/post-json.js'
import { atShopifyRoot } from '../../../network/shopify-root.js'
import { makeMapNetworkErrorToCartError } from '../../blueprints/operations/map-network-error-to-cart-error.js'
import { makeMapParseErrorToCartError } from '../../blueprints/operations/map-parse-error-to-cart-error.js'
import { AddItemsPayload } from './payload.js'

export type { AddItemsPayload, SingleItemPayload } from './payload.js'

// Response schemas
export const OptionsWithValues = z.object({
  name: z.string(),
  value: z.string()
})

export type OptionsWithValues = z.infer<typeof OptionsWithValues>

export const ItemAddedToCart = z.object({
  key: z.string(),
  quantity: z.number().min(1).optional().default(1)
})
export type ItemAddedToCart = z.infer<typeof ItemAddedToCart>

export const ItemsAddedToCart = z.object({
  items: z.array(ItemAddedToCart)
})
export type ItemsAddedToCart = z.infer<typeof ItemsAddedToCart>

export const addItems = async ({
  payload: _payload,
  signal
}: {
  payload: AddItemsPayload
  signal: AbortSignal
}): Promise<ItemsAddedToCart> => {
  // Parse payload
  const payload = await AddItemsPayload.parseAsync(_payload).catch(
    makeMapParseErrorToCartError('Invalid add items payload')
  )

  const _response = await postJson({
    url: atShopifyRoot('/cart/add.js'),
    json: payload,
    options: { signal }
  }).catch(
    makeMapNetworkErrorToCartError({
      userErrorMessage: 'Failed to add items to cart',
      communicationErrorMessage: 'Network error while adding items to cart'
    })
  )

  const response = await ItemsAddedToCart.parseAsync(_response).catch(
    makeMapParseErrorToCartError('Invalid add items response')
  )

  return response
}
