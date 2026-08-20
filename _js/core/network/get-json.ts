import type { JSONValue } from '../typescript/json-value.js'
import { CoreNetworkError } from './core-network-error.js'
import { getNativeFetch, isNativeFunction } from './native-fetch.js'

export type GetJsonInput = {
  url: string | URL
  options?: Omit<RequestInit, 'method' | 'body'>
}

export const getJson = async ({
  url: _url,
  options
}: GetJsonInput): Promise<JSONValue> => {
  /**
   * Use a url string in the actual fetch calls
   * because some third-party apps spy on the string urls only, such as Cartbot app
   */
  const url: string = typeof _url === 'string' ? _url : _url.toString()

  try {
    const params = {
      method: 'GET',
      // We should not set "Accept: 'application/json'" header by default,
      // otherwise Shopify would return wrong data
      // for requests like GET /products/my-product?sections=my-section
      ...options
    }

    const res = await window.fetch(url, params).catch((err: unknown) => {
      if (isNativeFunction(window.fetch)) {
        throw err
      }

      console.warn('Retrying with native fetch', url)
      const nativeFetch = getNativeFetch()

      return nativeFetch(url, params)
    })

    if (res.ok) {
      const response: JSONValue = await res.json()
      return response
    }

    const errorResponse: JSONValue = await res.json().catch(() => null)

    throw new CoreNetworkError('Network error', {
      url,
      method: 'GET',
      status: res.status,
      errorResponse,
      source: 'core/network/get-json'
    })
  } catch (err) {
    if (err instanceof CoreNetworkError) {
      throw err
    }

    const message = err instanceof Error ? err.message : 'Unknown error'

    throw new CoreNetworkError(message, {
      url,
      method: 'GET',
      source: 'core/network/get-json'
    })
  }
}
