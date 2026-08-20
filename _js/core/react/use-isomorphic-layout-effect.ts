import { useEffect, useLayoutEffect } from 'react'

/**
 * Custom hook for using either `useLayoutEffect` or `useEffect` based on the environment (client-side or server-side).
 * @example
 * useIsomorphicLayoutEffect(() => {
 *   // Code to be executed during the layout phase on the client side
 * }, [dependency1, dependency2]);
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect
