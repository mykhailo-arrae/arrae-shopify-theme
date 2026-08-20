import type { CartContext } from '../../blueprints/context/index.js'
import {
  type MakeEpic,
  makeEpicWithCallback,
  type Operations
} from '../../blueprints/epic/index.js'
import { CartImplementationError } from '../../blueprints/errors/cart-implementation-error.js'
import type { AddItemsPayload } from '../../operations/add-items/payload.js'

const makeEpic: MakeEpic<
  Pick<
    Operations,
    'addItems' | 'postProcessCart' | 'getCurrentTimestamp' | 'broadcast'
  >,
  AddItemsPayload,
  CartContext
> = ({
  Operations: { addItems, postProcessCart, getCurrentTimestamp, broadcast }
}) => {
  return async ({ signal, payload, prevContext }) => {
    const { items: addedItems } = await addItems({ payload, signal })

    const { cart, warnings } = await postProcessCart({ signal })

    broadcast({
      name: 'cart:items:added',
      details: {
        items: addedItems
      },
      source: { type: 'global' }
    })

    return {
      __type: 'Cart',
      cart,
      latestOperations: [
        ...prevContext.latestOperations,
        {
          __type: 'addedItems',
          timestamp: getCurrentTimestamp(),
          items: addedItems
        }
      ],
      warnings: [...prevContext.warnings, ...warnings]
    }
  }
}

export const makeAddItemsEpic = makeEpicWithCallback({
  makeEpic,
  mapInput: ({ event }) => {
    if (event.type === 'AddItems') {
      return {
        payload: event.payload,
        cb: event.cb
      }
    }

    throw new CartImplementationError('Invalid event type', {
      description: `Expected AddItems, but got ${event.type}`
    })
  }
})
