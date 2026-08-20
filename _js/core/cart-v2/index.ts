import { createActor } from 'xstate'
import type { _MachineEvent } from './blueprints/events/index.js'
import { cartMessageBus } from './broadcast/index.js'
import { cartMachineConfig } from './config/index.js'
import { listenForRefreshRequest } from './listen-for-refresh-request.js'

const _CartEngine = createActor(cartMachineConfig, {
  input: {
    context: {
      __type: 'NoCart',
      cart: null,
      latestOperations: [],
      warnings: []
    }
  },
  inspect: {
    error: (err) => {
      console.error('Cart Engine Error', err)
    }
  }
})

type FullCartSnapshot = ReturnType<typeof _CartEngine.getSnapshot>
export type CartSnapshot = {
  value: FullCartSnapshot['value']
  context: FullCartSnapshot['context']
}

export type Cart = {
  /**
   * Check if an event is allowed in the current state.
   *
   * @example
   * ```ts
   * const isAllowed = Cart.canSend({ type: 'AddItems', payload: { items: [{ id: '123', quantity: 1 }] } })
   * if (isAllowed) {
   *   console.log('Items can be added')
   * }
   * ```
   */
  readonly canSend: (event: _MachineEvent) => boolean
  /**
   * Send an event to the cart engine.
   *
   * @param event - The event to send to the cart engine.
   * @returns
   * - A promise that resolves with `ok` when the event is processed.
   * - Does nothing and resolves with `busy` if the event is not allowed in the current state.
   *
   * @example
   * ```ts
   * const result = await Cart.sendAsync({ type: 'AddItems', payload: { items: [{ id: '123', quantity: 1 }] } })
   * if (result === 'busy') {
   *   console.log('Cannot add item in this state, try again later')
   * }
   * if (result === 'ok') {
   *   console.log('Item added')
   * }
   * ```
   */
  readonly sendAsync: (event: _MachineEvent) => Promise<'ok' | 'busy'>
  /**
   * Send an event to the cart engine and don't wait for the response.
   *
   * @param event - The event to send to the cart engine.
   */
  readonly send: (event: _MachineEvent) => void
  /**
   * Subscribe to cart state changes.
   *
   * @param observer - A function that will be called whenever the cart state changes.
   * @returns A subscription object with an unsubscribe method.
   */
  readonly subscribe: (observer: (snapshot: CartSnapshot) => void) => {
    unsubscribe: () => void
  }
  /**
   * Get the current cart state snapshot.
   *
   * @returns The current cart state including context and value (state name).
   *
   * @example
   * ```ts
   * const snapshot = Cart.getSnapshot()
   * console.log(snapshot.value) // 'Ready'
   * console.log(snapshot.context) // { cart: { items: [] }, ...rest }
   * ```
   */
  readonly getSnapshot: () => CartSnapshot
  /**
   * Subscribe to cart events via the message bus.
   *
   * @example
   * ```ts
   * Cart.on('cart:items:added').do((evt) => {
   *   console.log(evt)
   * })
   * ```
   */
  readonly on: typeof cartMessageBus.on
}

let _Cart: Cart | null = null

/**
 * Initialize the cart engine.
 *
 * Returns the same instance regardless of how many times it is called.
 */
export const initCart = (): Cart => {
  if (_Cart) {
    return _Cart
  }

  _CartEngine.start()

  _CartEngine.send({
    type: 'Init',
    payload: null
  })

  _Cart = {
    canSend: (evt) => {
      return _CartEngine.getSnapshot().can(evt)
    },
    sendAsync: async (evt) => {
      const isAllowed = _CartEngine.getSnapshot().can(evt)

      if (!isAllowed) {
        return 'busy'
      }

      await new Promise<undefined>((resolve, reject) => {
        _CartEngine.send({
          ...evt,
          cb: {
            resolve,
            reject
          }
        })
      })

      return 'ok'
    },
    send: (evt) => {
      _CartEngine.send(evt)
    },
    subscribe: (observer) => {
      const sub = _CartEngine.subscribe(observer)

      return {
        unsubscribe: () => {
          sub.unsubscribe()
        }
      }
    },
    getSnapshot: (): CartSnapshot => {
      const { context, value } = _CartEngine.getSnapshot()

      return { context, value }
    },
    on: cartMessageBus.on
  } as const

  listenForRefreshRequest(_Cart)

  return _Cart
}
