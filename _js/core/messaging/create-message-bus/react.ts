import { useEffect, useRef } from 'react'
import type { BaseMessage, MessageBus } from './index.js'

export const makeUseMessageBus = <M extends BaseMessage>(
  bus: MessageBus<M>
) => {
  /**
   * A React hook that subscribes to messages of a certain type
   *
   * For best performance, the callback function should be memoized with `useCallback`
   *
   * @returns Bus instance
   */
  return function useMessageBus<N extends M['name']>(
    messageName: N,
    callback: (evt: Extract<M, { name: N }>) => void
  ): typeof bus {
    // It's highly likely we'll receive a new callback function on each render
    // so we track it as a mutable ref to avoid subscription thrashing
    const callbackRef = useRef(callback)

    useEffect(() => {
      callbackRef.current = callback
    }, [callback])

    // We set up a single subscription for the lifetime of the component
    // but use the current callback function as the handler
    useEffect(() => {
      return bus.on(messageName).do((message) => {
        callbackRef.current(message)
      })
    }, [messageName])

    return bus
  }
}
