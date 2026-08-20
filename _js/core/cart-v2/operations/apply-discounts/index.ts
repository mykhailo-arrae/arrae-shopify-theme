import { postJson } from '../../../network/post-json.js'
import { atShopifyRoot } from '../../../network/shopify-root.js'
import { makeMapNetworkErrorToCartError } from '../../blueprints/operations/map-network-error-to-cart-error.js'
import { makeMapParseErrorToCartError } from '../../blueprints/operations/map-parse-error-to-cart-error.js'
import { fetchCart } from '../fetch-cart/index.js'
import { ApplyDiscountsPayload } from './payload.js'

export const applyDiscounts = async ({
  payload,
  signal
}: {
  payload: ApplyDiscountsPayload
  signal: AbortSignal
}): Promise<void> => {
  // Parse payload
  const { add, remove } = await ApplyDiscountsPayload.parseAsync(payload).catch(
    makeMapParseErrorToCartError('Invalid apply discounts payload')
  )

  // Fetch current cart to get existing discount codes
  const cart = await fetchCart({ signal })

  // Get current discount codes
  const currentCodes = cart.discount_codes.map((dc) => dc.code)

  // Apply add/remove logic
  const removeSet = new Set(remove)
  const remainingCodes = currentCodes.filter((code) => !removeSet.has(code))
  const finalCodes = [...new Set([...remainingCodes, ...add])]

  // Update cart with new discount codes
  // Shopify expects comma-separated string or empty string to clear all
  await postJson({
    url: atShopifyRoot('/cart/update.js'),
    json: {
      discount: finalCodes.join(',')
    },
    options: { signal }
  }).catch(
    makeMapNetworkErrorToCartError({
      userErrorMessage: 'Failed to update discount codes',
      communicationErrorMessage: 'Network error while updating discount codes'
    })
  )
}
