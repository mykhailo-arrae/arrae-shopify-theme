import type { JSONValue } from '../typescript/json-value.js'
import { CoreNetworkError } from './core-network-error.js'
import { getNativeFetch, isNativeFunction } from './native-fetch.js'

export type PostJsonInput = {
  url: string | URL
  json: unknown
  options?: Omit<RequestInit, 'method' | 'body'>
}

export const postJson = async ({
  url: _url,
  json,
  options
}: PostJsonInput): Promise<JSONValue> => {
  /**
   * Use a url string in the actual fetch calls
   * because some third-party apps spy on the string urls only, such as Cartbot app
   */
  const url: string = typeof _url === 'string' ? _url : _url.toString()

  try {
    const params = {
      method: 'POST',
      body: JSON.stringify(json),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
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
      status: res.status,
      errorResponse,
      json,
      method: 'POST',
      source: 'core/network/post-json'
    })
  } catch (err) {
    if (err instanceof CoreNetworkError) {
      throw err
    }

    const message = err instanceof Error ? err.message : 'Unknown error'

    throw new CoreNetworkError(message, {
      url,
      json,
      method: 'POST',
      source: 'core/network/post-json'
    })
  }
}
