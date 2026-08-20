/**
 * A custom error class for cart implementation errors.
 *
 * @example
 * throw new CartImplementationError('This was not supposed to happen', {
 *   description: 'Product not found',
 *   metadata: {
 *     productId: 123
 *   }
 * })
 */
export class CartImplementationError extends Error {
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
