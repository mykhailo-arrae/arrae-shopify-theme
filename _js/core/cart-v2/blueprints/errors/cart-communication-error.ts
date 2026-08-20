/**
 * A custom error class for communication errors with external systems.
 * This includes network errors, API response parsing errors, timeouts, etc.
 *
 * @example
 * throw new CartCommunicationError('Failed to fetch cart data', {
 *   description: 'Network timeout after 5 seconds',
 *   metadata: {
 *     statusCode: 408
 *   }
 * })
 */
export class CartCommunicationError extends Error {
  constructor(
    message: string,
    public readonly details: {
      cause?: unknown
      description: string
      metadata?: Record<string, unknown>
    }
  ) {
    super(message, { cause: details.cause })

    Object.defineProperty(this, 'name', {
      value: new.target.name,
      enumerable: false,
      configurable: true
    })

    Object.setPrototypeOf(this, new.target.prototype)
  }
}
