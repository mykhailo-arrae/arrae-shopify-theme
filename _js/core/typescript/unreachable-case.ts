/**
 * A custom error class to enable exhaustiveness checking in Typescript
 *
 * Read more:
 * - [TS Handbook](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking)
 * - [LogRocket Article](https://blog.logrocket.com/improve-error-handling-typescript-exhaustive-type-checking/#adding-exhaustive-type-checking)
 */
export class UnreachableCaseError extends Error {
  constructor(value: never, message = 'Unreachable case') {
    super([message, JSON.stringify(value)].join(': '))

    Object.defineProperty(this, 'name', {
      value: new.target.name,
      enumerable: false,
      configurable: true
    })

    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * An assertion function to enable exhaustiveness checking in Typescript
 *
 * See:
 * Read more:
 * - [TS Handbook](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking)
 * - [LogRocket Article](https://blog.logrocket.com/improve-error-handling-typescript-exhaustive-type-checking/#adding-exhaustive-type-checking)
 */
export const assertUnreachable = (value: never, message?: string): never => {
  throw new UnreachableCaseError(value, message)
}
