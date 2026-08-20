import type { CartContext } from '../../blueprints/context/index.js'
import {
  type MakeEpic,
  makeEpicWithCallback,
  type Operations
} from '../../blueprints/epic/index.js'
import { CartImplementationError } from '../../blueprints/errors/cart-implementation-error.js'
import type { AddAttributesPayload } from '../../operations/add-attributes/payload.js'

const makeEpic: MakeEpic<
  Pick<
    Operations,
    'addAttributes' | 'postProcessCart' | 'getCurrentTimestamp' | 'broadcast'
  >,
  AddAttributesPayload,
  CartContext
> = ({
  Operations: { addAttributes, postProcessCart, getCurrentTimestamp, broadcast }
}) => {
  return async ({ signal, payload, prevContext }) => {
    // Update cart attributes
    await addAttributes({ payload, signal })

    // Post process cart
    const { cart, warnings } = await postProcessCart({ signal })

    broadcast({
      name: 'cart:attributes:added',
      details: null,
      source: { type: 'global' }
    })

    return {
      __type: 'Cart',
      cart,
      latestOperations: [
        ...prevContext.latestOperations,
        {
          __type: 'addedAttributes',
          timestamp: getCurrentTimestamp()
        }
      ],
      warnings: [...prevContext.warnings, ...warnings]
    }
  }
}

export const makeAddAttributesEpic = makeEpicWithCallback({
  makeEpic,
  mapInput: ({ event }) => {
    if (event.type === 'AddAttributes') {
      return { payload: event.payload }
    }

    throw new CartImplementationError('Invalid event type', {
      description: `Expected AddAttributes, but got ${event.type}`
    })
  }
})
