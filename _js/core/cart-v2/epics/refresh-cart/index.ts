import type { CartContext } from '../../blueprints/context/index.js'
import {
  type MakeEpic,
  makeEpicWithCallback,
  type Operations
} from '../../blueprints/epic/index.js'
import { CartImplementationError } from '../../blueprints/errors/cart-implementation-error.js'

const makeEpic: MakeEpic<
  Pick<Operations, 'postProcessCart'>,
  null,
  CartContext
> = ({ Operations: { postProcessCart } }) => {
  return async ({ signal, prevContext }) => {
    // Post process cart
    const { cart, warnings } = await postProcessCart({ signal })

    return {
      __type: 'Cart',
      cart,
      latestOperations: prevContext.latestOperations,
      warnings: [...prevContext.warnings, ...warnings]
    }
  }
}

export const makeRefreshCartEpic = makeEpicWithCallback({
  makeEpic,
  mapInput: ({ event }) => {
    if (event.type === 'RefreshCart') {
      return {
        payload: event.payload,
        cb: event.cb
      }
    }

    throw new CartImplementationError('Invalid event type', {
      description: `Expected RefreshCart, but got ${event.type}`
    })
  }
})
