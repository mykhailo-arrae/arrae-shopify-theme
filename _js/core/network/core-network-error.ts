import type { JSONValue } from '../typescript/json-value.js'

/**
 * A custom error class for network-related operations.
 *
 * @example
 * throw new CoreNetworkError('Failed to fetch data', {
 *   url: 'https://api.example.com/data',
 *   statusCode: 500,
 *   method: 'GET'
 * })
 */
export class CoreNetworkError extends Error {
  constructor(
    message: string,
    public details: {
      url: string
      method: string
      status?: number
      errorResponse?: JSONValue
      [k: string]: unknown
    }
  ) {
    super(message)

    Object.defineProperty(this, 'name', {
      value: new.target.name,
      enumerable: false,
      configurable: true
    })

    Object.setPrototypeOf(this, new.target.prototype)
  }
}
