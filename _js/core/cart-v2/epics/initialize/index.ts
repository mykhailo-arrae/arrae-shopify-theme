import type { CartContext } from '../../blueprints/context/index.js'
import {
  type MakeEpic,
  makeEpicWithCallback,
  type Operations
} from '../../blueprints/epic/index.js'
import { CartImplementationError } from '../../blueprints/errors/cart-implementation-error.js'

const makeEpic: MakeEpic<
  Pick<Operations, 'getCurrentTimestamp' | 'postProcessCart' | 'broadcast'>,
  null,
  CartContext
> = ({ Operations: { getCurrentTimestamp, postProcessCart, broadcast } }) => {
  return async ({ signal }) => {
    const { cart, warnings } = await postProcessCart({ signal })

    broadcast({
      name: 'cart:initialized',
      details: null,
      source: { type: 'global' }
    })

    return {
      __type: 'Cart',
      cart,
      warnings,
      latestOperations: [
        { __type: 'initialized', timestamp: getCurrentTimestamp() }
      ]
    }
  }
}

export const makeInitializeEpic = makeEpicWithCallback({
  makeEpic,
  mapInput: ({ event }) => {
    if (event.type === 'Init') {
      return { payload: null }
    }

    throw new CartImplementationError('Invalid event type', {
      description: `Expected Init, but got ${event.type}`
    })
  }
})
