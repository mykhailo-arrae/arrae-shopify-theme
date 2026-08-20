import type { CartContext } from '../../blueprints/context/index.js'
import {
  type MakeEpic,
  makeEpicWithCallback,
  type Operations
} from '../../blueprints/epic/index.js'
import { CartImplementationError } from '../../blueprints/errors/cart-implementation-error.js'
import type { RemoveItemsPayload } from './payload.js'

const makeEpic: MakeEpic<
  Pick<
    Operations,
    | 'removeItems'
    | 'postProcessCart'
    | 'getCurrentTimestamp'
    | 'broadcast'
    | 'fetchCart'
  >,
  RemoveItemsPayload,
  CartContext
> = ({
  Operations: {
    removeItems,
    postProcessCart,
    getCurrentTimestamp,
    broadcast,
    fetchCart
  }
}) => {
  return async ({ signal, payload, prevContext }) => {
    // Fetch current cart state to reduce the chance of false positive errors
    const currentCart = await fetchCart({ signal })

    const removableItems = payload.lineItemKeys.flatMap((key) => {
      const item = currentCart.items.find((it) => it.key === key)

      if (item == null) {
        return []
      }

      return { key, title: item.title }
    })

    // Remove items from cart
    await removeItems({
      payload: { lineItemKeys: removableItems.map((it) => it.key) },
      signal
    })

    // Post process cart
    const { cart, warnings } = await postProcessCart({ signal })

    broadcast({
      name: 'cart:items:removed',
      details: {
        items: removableItems
      },
      source: { type: 'global' }
    })

    return {
      __type: 'Cart',
      cart,
      latestOperations: [
        ...prevContext.latestOperations,
        {
          __type: 'removedItems',
          timestamp: getCurrentTimestamp(),
          items: removableItems
        }
      ],
      warnings: [...prevContext.warnings, ...warnings]
    }
  }
}

export const makeRemoveItemsEpic = makeEpicWithCallback({
  makeEpic,
  mapInput: ({ event }) => {
    if (event.type === 'RemoveItems') {
      return {
        payload: event.payload,
        cb: event.cb
      }
    }

    throw new CartImplementationError('Invalid event type', {
      description: `Expected RemoveItems, but got ${event.type}`
    })
  }
})
