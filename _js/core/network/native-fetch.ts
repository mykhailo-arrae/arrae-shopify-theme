/**
 * Check if the function is implemented as native browser code
 */
export const isNativeFunction = (func: unknown): boolean => {
  return (
    typeof func === 'function' &&
    /\{\s+\[native code\]/.test(Function.prototype.toString.call(func))
  )
}

let nativeFetch: WindowOrWorkerGlobalScope['fetch'] | null = null

/**
 * Get a reference to native window.fetch
 *
 * Sometimes a third-party library overwrites window.fetch with a polyfill,
 * resulting in unexpected behavior.
 */
export const getNativeFetch = (): WindowOrWorkerGlobalScope['fetch'] => {
  if (isNativeFunction(window.fetch)) {
    return window.fetch
  }

  if (nativeFetch != null) {
    return nativeFetch
  }

  const iframe = document.createElement('iframe')

  iframe.style.display = 'none'
  document.body.appendChild(iframe)

  if (iframe.contentWindow == null) {
    throw new Error('Native fetch function cannot be restored')
  }

  nativeFetch = iframe.contentWindow.fetch.bind(window)

  return nativeFetch
}
