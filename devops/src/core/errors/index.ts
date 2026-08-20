export class DevOpsError extends Error {
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
    Error.captureStackTrace(this, this.constructor)
  }
}
