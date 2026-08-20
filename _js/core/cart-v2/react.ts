import { useEffect, useRef, useState } from 'react'
import type { Context } from './blueprints/context/index.js'
import type { State } from './blueprints/state/index.js'
import { type Cart, initCart } from './index.js'

/**
 * Use cart actions, e.g., send() and sendAsync().
 *
 * @example
 * ```ts
 * const cart = useCartActions()
 * useEffect(() => {
 *   cart.send({ type: 'AddItems', payload: { items: [{ id: '123', quantity: 1 }] } })
 * }, [])
 * ```
 */
export const useCartActions = (): Cart => {
  const [cart] = useState(() => initCart())

  return cart
}

/**
 * Use cart state, e.g., cart.items.
 *
 * @param selector - A selector function that allows you to select a part of the cart state to reduce re-renders.
 *
 * @returns The result of the selector function.
 *
 * @example
 * ```ts
 * const cartItems = useCartState((c) => c.cart?.items ?? [])
 * const cartTotalPrice: number = useCartState((c) => c.cart?.total_price ?? 0)
 * const cartState = useCartState((_, s) => s) // 'Ready'
 * ```
 */
export const useCartState = <T>(
  _selector: (context: Context, value: State) => T
): T => {
  const [cart] = useState(() => initCart())
  const [result, setResult] = useState<T>(() => {
    const snapshot = cart.getSnapshot()
    return _selector(snapshot.context, snapshot.value)
  })

  /**
   * Guard against re-rendering the component when the selector function changes.
   */
  const selector = useRef(_selector)
  useEffect(() => {
    selector.current = _selector
  }, [_selector])

  useEffect(() => {
    const sub = cart.subscribe((state) => {
      if (selector.current == null) {
        return
      }

      setResult(() => {
        return selector.current(state.context, state.value)
      })
    })

    return () => {
      sub.unsubscribe()
    }
  }, [cart])

  return result
}
