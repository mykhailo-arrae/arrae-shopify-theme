import _logger from 'loglevel'

const PREFIX = 'cart-v2'
const LOG_LEVEL_CHECK_INTERVAL = 1000

export type Logger = {
  silent: (..._: unknown[]) => void
  trace: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

let logger: Logger | null = null
let timerId: ReturnType<typeof setInterval> | null = null

const isDebugEnabled = (): boolean => {
  try {
    // Check window.DEBUG in browser environment
    if (typeof window !== 'undefined') {
      return 'DEBUG' in window && Boolean(window.DEBUG)
    }

    // Check global.DEBUG in Node.js environment
    if (typeof global !== 'undefined') {
      return 'DEBUG' in global && Boolean(global.DEBUG)
    }

    return false
  } catch {
    return false
  }
}

/**
 * Initializes the logger.
 *
 * This is a singleton that can be initialized multiple times.
 *
 * @returns The logger instance.
 */
export const initLogger = (): Logger => {
  if (logger) {
    return logger
  }

  const cartLogger = _logger.getLogger(PREFIX)

  const adjustLogLevel = (): void => {
    cartLogger.setLevel(
      isDebugEnabled() ? _logger.levels.TRACE : _logger.levels.WARN,
      // do not persist in local storage
      false
    )
  }

  if (timerId == null) {
    timerId = setInterval(adjustLogLevel, LOG_LEVEL_CHECK_INTERVAL)
  }

  adjustLogLevel()

  logger = {
    silent: (): void => {
      /* noop */
    },
    trace: (...args) => {
      cartLogger.debug(PREFIX, ...args)
    },
    debug: (...args) => {
      cartLogger.debug(PREFIX, ...args)
    },
    info: (...args) => {
      cartLogger.info(PREFIX, ...args)
    },
    warn: (...args) => {
      cartLogger.warn(PREFIX, ...args)
    },
    error: (...args) => {
      cartLogger.error(PREFIX, ...args)
    }
  }

  return logger
}

/**
 * Cleanup function to clear the debug check interval.
 * Call this when shutting down the logger.
 */
export const cleanupLogger = (): void => {
  if (timerId != null) {
    clearInterval(timerId)
    timerId = null
  }
}
