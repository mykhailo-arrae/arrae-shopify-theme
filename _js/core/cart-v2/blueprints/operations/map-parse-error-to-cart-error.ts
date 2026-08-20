import { ZodError } from 'zod'
import { CartImplementationError } from '../errors/cart-implementation-error.js'

export const makeMapParseErrorToCartError =
  (userErrorMessage: string) =>
  (err: unknown): Promise<never> => {
    if (err instanceof ZodError) {
      throw new CartImplementationError(userErrorMessage, {
        cause: err,
        description: 'Validation error',
        metadata: {
          issues: err.issues
        }
      })
    }

    throw new CartImplementationError(userErrorMessage, {
      cause: err,
      description: err instanceof Error ? err.message : 'Unknown error'
    })
  }
