import type { CartContext } from '../../blueprints/context/index.js'
import {
  type MakeEpic,
  makeEpicWithCallback,
  type Operations
} from '../../blueprints/epic/index.js'
import { CartImplementationError } from '../../blueprints/errors/cart-implementation-error.js'

const makeEpic: MakeEpic<
  Pick<
    Operations,
    'clearCart' | 'postProcessCart' | 'getCurrentTimestamp' | 'broadcast'
  >,
  undefined,
  CartContext
> = ({
  Operations: { clearCart, postProcessCart, getCurrentTimestamp, broadcast }
}) => {
  return async ({ signal, prevContext }) => {
    // Clear cart
    await clearCart({ signal })

    // Post process cart
    const { cart, warnings } = await postProcessCart({ signal })

    broadcast({
      name: 'cart:cleared',
      details: null,
      source: { type: 'global' }
    })

    return {
      __type: 'Cart',
      cart,
      latestOperations: [
        ...prevContext.latestOperations,
        {
          __type: 'clearedCart',
          timestamp: getCurrentTimestamp()
        }
      ],
      warnings: [...prevContext.warnings, ...warnings]
    }
  }
}

export const makeClearCartEpic = makeEpicWithCallback({
  makeEpic,
  mapInput: ({ event }) => {
    if (event.type === 'ClearCart') {
      return {
        payload: undefined,
        cb: event.cb
      }
    }

    throw new CartImplementationError('Invalid event type', {
      description: `Expected ClearCart, but got ${event.type}`
    })
  }
})
