import { getJson } from '../../../network/get-json.js'
import { atShopifyRoot } from '../../../network/shopify-root.js'
import { Cart } from '../../blueprints/cart/index.js'
import { makeMapNetworkErrorToCartError } from '../../blueprints/operations/map-network-error-to-cart-error.js'
import { makeMapParseErrorToCartError } from '../../blueprints/operations/map-parse-error-to-cart-error.js'

export const fetchCart = async ({
  signal
}: {
  signal: AbortSignal
}): Promise<Cart> => {
  const _cart = await getJson({
    url: atShopifyRoot('/cart.json'),
    options: { signal }
  }).catch(
    makeMapNetworkErrorToCartError({
      userErrorMessage: 'Failed to fetch cart data',
      communicationErrorMessage: 'Network error while fetching cart data'
    })
  )

  const cart = await Cart.parseAsync(_cart).catch(
    makeMapParseErrorToCartError('Failed to parse cart response')
  )

  return cart
}
