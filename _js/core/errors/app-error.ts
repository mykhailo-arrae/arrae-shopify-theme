/**
 * A custom error class that can include arbitrary details.
 *
 * The `traceTag` property can be used as a standardized way
 * to track the sequence of events that led to the error.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public details: { traceTag?: string | null; [k: string]: unknown } = {
      traceTag: null
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
