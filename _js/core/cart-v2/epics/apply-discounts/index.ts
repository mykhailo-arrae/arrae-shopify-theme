import type { CartContext } from '../../blueprints/context/index.js'
import {
  type MakeEpic,
  makeEpicWithCallback,
  type Operations
} from '../../blueprints/epic/index.js'
import { CartImplementationError } from '../../blueprints/errors/cart-implementation-error.js'
import type { ApplyDiscountsPayload } from '../../operations/apply-discounts/payload.js'

const makeEpic: MakeEpic<
  Pick<
    Operations,
    'applyDiscounts' | 'postProcessCart' | 'getCurrentTimestamp' | 'broadcast'
  >,
  ApplyDiscountsPayload,
  CartContext
> = ({
  Operations: {
    applyDiscounts,
    postProcessCart,
    getCurrentTimestamp,
    broadcast
  }
}) => {
  return async ({ signal, payload, prevContext }) => {
    // Apply discounts
    await applyDiscounts({ payload, signal })

    // Post process cart
    const { cart, warnings } = await postProcessCart({ signal })

    broadcast({
      name: 'cart:discounts:applied',
      details: {
        discountCodes: cart.discount_codes
      },
      source: { type: 'global' }
    })

    return {
      __type: 'Cart',
      cart,
      latestOperations: [
        ...prevContext.latestOperations,
        {
          __type: 'appliedDiscounts',
          timestamp: getCurrentTimestamp(),
          add: payload.add || [],
          remove: payload.remove || []
        }
      ],
      warnings: [...prevContext.warnings, ...warnings]
    }
  }
}

export const makeApplyDiscountsEpic = makeEpicWithCallback({
  makeEpic,
  mapInput: ({ event }) => {
    if (event.type === 'ApplyDiscounts') {
      return {
        payload: event.payload,
        cb: event.cb
      }
    }

    throw new CartImplementationError('Invalid event type', {
      description: `Expected ApplyDiscounts, but got ${event.type}`
    })
  }
})
