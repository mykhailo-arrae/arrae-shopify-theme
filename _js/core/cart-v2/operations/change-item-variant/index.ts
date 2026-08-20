import { postJson } from '../../../network/post-json.js'
import { atShopifyRoot } from '../../../network/shopify-root.js'
import type { CartItem } from '../../blueprints/cart/item.js'
import { makeMapNetworkErrorToCartError } from '../../blueprints/operations/map-network-error-to-cart-error.js'
import { makeMapParseErrorToCartError } from '../../blueprints/operations/map-parse-error-to-cart-error.js'
import { fetchCart } from '../fetch-cart/index.js'
import { ChangeVariantPayload } from './payload.js'

type CartAddLineItem = {
  variantId: number
  quantity: number
  properties?: Record<string, unknown> | null
  sellingPlan?: number | null
}

const buildCartAddLineItem = ({
  variantId,
  quantity,
  properties,
  sellingPlan
}: CartAddLineItem): Record<string, unknown> => {
  const addItem: Record<string, unknown> = {
    id: variantId,
    quantity
  }

  if (properties != null && Object.keys(properties).length > 0) {
    addItem.properties = properties
  }

  if (sellingPlan != null) {
    addItem.selling_plan = sellingPlan
  }

  return addItem
}

const snapshotLineItemForRestore = (lineItem: CartItem): CartAddLineItem => ({
  variantId: lineItem.variant_id,
  quantity: lineItem.quantity,
  properties: lineItem.properties,
  sellingPlan: lineItem.selling_plan_allocation?.selling_plan.id ?? null
})

const addCartLine = async ({
  addItem,
  signal,
  userErrorMessage,
  communicationErrorMessage
}: {
  addItem: Record<string, unknown>
  signal: AbortSignal
  userErrorMessage: string
  communicationErrorMessage: string
}): Promise<void> => {
  await postJson({
    url: atShopifyRoot('/cart/add.js'),
    json: { items: [addItem] },
    options: { signal }
  }).catch(
    makeMapNetworkErrorToCartError({
      userErrorMessage,
      communicationErrorMessage
    })
  )
}

export const changeItemVariant = async ({
  payload: _payload,
  signal
}: {
  payload: ChangeVariantPayload
  signal: AbortSignal
}): Promise<void> => {
  const { items } = await ChangeVariantPayload.parseAsync(_payload).catch(
    makeMapParseErrorToCartError('Invalid change variant payload')
  )

  for (const {
    lineItemKey,
    variantId,
    sellingPlan,
    quantity: quantityOverride,
    properties
  } of items) {
    const cart = await fetchCart({ signal })
    const lineItem = cart.items.find((item) => item.key === lineItemKey)

    if (!lineItem) {
      continue
    }

    const quantity = quantityOverride ?? lineItem.quantity
    const originalLine = snapshotLineItemForRestore(lineItem)

    await postJson({
      url: atShopifyRoot('/cart/change.js'),
      json: { id: lineItemKey, quantity: 0 },
      options: { signal }
    }).catch(
      makeMapNetworkErrorToCartError({
        userErrorMessage: 'Failed to update cart item',
        communicationErrorMessage:
          'Network error while removing cart line for variant change'
      })
    )

    const newLineItem = buildCartAddLineItem({
      variantId,
      quantity,
      properties,
      sellingPlan
    })

    try {
      await addCartLine({
        addItem: newLineItem,
        signal,
        userErrorMessage: 'Failed to update cart item',
        communicationErrorMessage:
          'Network error while adding cart line for variant change'
      })
    } catch (err) {
      const addError = err

      await addCartLine({
        addItem: buildCartAddLineItem(originalLine),
        signal,
        userErrorMessage: 'Failed to restore cart item after variant change',
        communicationErrorMessage:
          'Network error while restoring cart line after variant change'
      }).catch((err: unknown) => {
        console.error(
          'Failed to restore cart line after variant change',
          { lineItemKey, originalLine },
          err,
          addError
        )
      })

      throw addError
    }
  }
}
