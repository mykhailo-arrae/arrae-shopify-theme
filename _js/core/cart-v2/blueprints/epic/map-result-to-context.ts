import type { DoneActorEvent, ErrorActorEvent } from 'xstate'
import { ZodError } from 'zod'
import { AppError } from '../../../errors/app-error.js'
import type {
  CartContext,
  CartErrorContext,
  Context
} from '../context/index.js'
import { getCurrentTimestamp } from '../context/timestamp.js'
import { CartCommunicationError } from '../errors/cart-communication-error.js'
import { CartImplementationError } from '../errors/cart-implementation-error.js'
import { CartUserError } from '../errors/cart-user-error.js'
import { initLogger } from '../logger/index.js'

export const LOOKBACK_IN_MS = 1000 * 60 * 1 // 1 minute

const dropOldEvents = <T extends { timestamp: number }>(events: T[]): T[] => {
  const now = getCurrentTimestamp()
  return events.filter((event) => now - event.timestamp < LOOKBACK_IN_MS)
}

type ErrorDetails =
  | {
      __type: 'CartUserError'
      message: string
      description?: string | null
    }
  | {
      __type: 'CartImplementationError'
      message: string
      description?: string | null
      metadata?: Record<string, unknown>
    }
  | {
      __type: 'CartCommunicationError'
      message: string
      description?: string | null
      metadata?: Record<string, unknown>
    }

/**
 * Extracts minimal error message and description from an unhandled error
 *
 * We should handle errors at the operations or epics level
 */
export const parseError = (err: unknown): ErrorDetails => {
  // Handle our custom cart errors
  if (err instanceof CartUserError) {
    return {
      __type: 'CartUserError',
      message: err.message,
      description: err.details.description
    }
  }

  if (err instanceof CartImplementationError) {
    return {
      __type: 'CartImplementationError',
      message: err.message,
      description: err.details.description,
      metadata: err.details.metadata
    }
  }

  if (err instanceof CartCommunicationError) {
    return {
      __type: 'CartCommunicationError',
      message: err.message,
      description: err.details.description,
      metadata: err.details.metadata
    }
  }

  // Handle other error types
  if (err instanceof ZodError) {
    return {
      __type: 'CartImplementationError',
      message: 'Validation error',
      description: err.issues
        .filter((_, i) => i <= 2)
        .map((issue) => issue.message)
        .join(', '),
      metadata: {
        issues: err.issues
      }
    }
  }

  if (err instanceof AppError) {
    return {
      __type: 'CartImplementationError',
      message: 'App error',
      description: err.message
    }
  }

  if (err instanceof Error) {
    return {
      __type: 'CartImplementationError',
      message: 'Unexpected error',
      description: err.message
    }
  }

  if (typeof err === 'string') {
    return {
      __type: 'CartImplementationError',
      message: 'Unexpected error',
      description: err
    }
  }

  return {
    __type: 'CartImplementationError',
    message: 'Unknown error type',
    description:
      err == null
        ? null
        : typeof err === 'object'
          ? JSON.stringify(err)
          : undefined
  }
}

const logger = initLogger()

export const mapEpicErrorToContext = ({
  event: { error: err, actorId },
  context
}: {
  event: ErrorActorEvent
  context: Context
}): CartErrorContext | CartContext => {
  const parsedError = parseError(err)

  logger.trace('mapEpicErrorToContext', parsedError)

  if (parsedError.__type === 'CartUserError' && context.__type === 'Cart') {
    return {
      __type: 'Cart',
      cart: context.cart,
      latestOperations: dropOldEvents(context.latestOperations),
      warnings: dropOldEvents([
        ...context.warnings,
        {
          message: parsedError.description || parsedError.message,
          timestamp: getCurrentTimestamp()
        }
      ])
    }
  }

  logger.warn('Unhandled cart machine error', parsedError, err)

  return {
    __type: 'CartError',
    cart: context.cart,
    error: {
      actorId,
      errorType: parsedError.__type,
      message: parsedError.description || parsedError.message
    },
    latestOperations: dropOldEvents(context.latestOperations),
    warnings: dropOldEvents(context.warnings)
  }
}

export const mapEpicDoneToContext = ({
  event: { output }
}: {
  event: DoneActorEvent<CartContext>
}): CartContext => {
  logger.trace('mapEpicDoneToContext', { output })

  return {
    ...output,
    latestOperations: dropOldEvents(output.latestOperations),
    warnings: dropOldEvents(output.warnings)
  }
}
