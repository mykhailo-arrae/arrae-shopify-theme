/**
 * Creates a function that is restricted to invoking `func` once. Repeat calls to the function return the value of the first invocation.
 *
 * @param fn - The function to wrap.
 * @signature once(fn)
 * @example
 * const initCart = once(_initCart);
 * initCart();
 * initCart();
 * // => `_initCart` is invoked once
 * @category Function
 */
export const once = <T>(fn: () => T): (() => T) => {
  let called = false
  let ret: T
  return () => {
    if (!called) {
      ret = fn()
      called = true
    }
    return ret
  }
}
