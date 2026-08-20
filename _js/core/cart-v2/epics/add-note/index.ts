import type { CartContext } from '../../blueprints/context/index.js'
import {
  type MakeEpic,
  makeEpicWithCallback,
  type Operations
} from '../../blueprints/epic/index.js'
import { CartImplementationError } from '../../blueprints/errors/cart-implementation-error.js'
import type { AddNotePayload } from '../../operations/add-note/payload.js'

const makeEpic: MakeEpic<
  Pick<
    Operations,
    'addNote' | 'postProcessCart' | 'getCurrentTimestamp' | 'broadcast'
  >,
  AddNotePayload,
  CartContext
> = ({
  Operations: { addNote, postProcessCart, getCurrentTimestamp, broadcast }
}) => {
  return async ({ signal, payload, prevContext }) => {
    // Update cart note
    await addNote({ payload, signal })

    // Post process cart
    const { cart, warnings } = await postProcessCart({ signal })

    broadcast({
      name: 'cart:note:added',
      details: null,
      source: { type: 'global' }
    })

    return {
      __type: 'Cart',
      cart,
      latestOperations: [
        ...prevContext.latestOperations,
        {
          __type: 'addedNote',
          timestamp: getCurrentTimestamp()
        }
      ],
      warnings: [...prevContext.warnings, ...warnings]
    }
  }
}

export const makeAddNoteEpic = makeEpicWithCallback({
  makeEpic,
  mapInput: ({ event }) => {
    if (event.type === 'AddNote') {
      return { payload: event.payload }
    }

    throw new CartImplementationError('Invalid event type', {
      description: `Expected AddNote, but got ${event.type}`
    })
  }
})
