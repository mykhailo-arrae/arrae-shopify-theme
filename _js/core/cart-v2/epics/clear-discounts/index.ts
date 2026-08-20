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
    'clearDiscounts' | 'postProcessCart' | 'getCurrentTimestamp' | 'broadcast'
  >,
  null,
  CartContext
> = ({
  Operations: {
    clearDiscounts,
    postProcessCart,
    getCurrentTimestamp,
    broadcast
  }
}) => {
  return async ({ signal, prevContext }) => {
    // Clear discounts from cart
    await clearDiscounts({ signal })

    // Post process cart
    const { cart, warnings } = await postProcessCart({ signal })

    broadcast({
      name: 'cart:discounts:cleared',
      details: null,
      source: { type: 'global' }
    })

    return {
      __type: 'Cart',
      cart,
      latestOperations: [
        ...prevContext.latestOperations,
        {
          __type: 'clearedDiscounts',
          timestamp: getCurrentTimestamp()
        }
      ],
      warnings: [...prevContext.warnings, ...warnings]
    }
  }
}

export const makeClearDiscountsEpic = makeEpicWithCallback({
  makeEpic,
  mapInput: ({ event }) => {
    if (event.type === 'ClearDiscounts') {
      return {
        payload: null,
        cb: event.cb
      }
    }

    throw new CartImplementationError('Invalid event type', {
      description: `Expected ClearDiscounts, but got ${event.type}`
    })
  }
})
