/**
 * A custom error class for errors that are caused by user actions.
 *
 * @example
 * throw new CartUserError('Product A is not available', {
 *   description: 'Product A is not available, please try again later',
 *   metadata: {
 *     productId: 123
 *   }
 * })
 */
export class CartUserError extends Error {
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
