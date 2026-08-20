import { EOL } from 'node:os'
import type { LoaderContext } from '@rspack/core'
import { Exception, type Logger as SassLogger } from 'sass-embedded'
import { DevOpsError } from '../errors/index.js'
import type { Logger as PinoLogger } from '../logger/index.js'

const parseSassStack = (stack: string | null | undefined): string[] => {
  return stack?.split(EOL).filter((line) => line) ?? []
}

export type RspackLogger = ReturnType<LoaderContext['getLogger']>

type Logger =
  | {
      type: 'pino'
      logger: PinoLogger
    }
  | {
      type: 'rspack'
      logger: RspackLogger
    }

export const makeSassLogger = ({
  logger: _logger,
  silent = true,
  filePath,
  filename
}: {
  logger: Logger
  silent?: boolean
  filePath?: string
  filename?: string
}): SassLogger => {
  const { logger, type: loggerType } = _logger

  return {
    debug: (message, { span }) => {
      if (silent) {
        return
      }

      logger.info(message, {
        logType: 'debug',
        path: filePath,
        span
      })
    },
    warn: (_message, { deprecation: isDeprecation, stack: _stack, span }) => {
      if (silent) {
        return
      }

      const stack: string[] = parseSassStack(_stack)

      const location: string | null =
        stack
          .find((line) => filename != null && line.startsWith(filename))
          ?.split(' ')
          .at(1) || null

      const messageLines = _message
        .trim()
        .split(EOL)
        .filter((line) => line)
        .filter((line) => line.includes('automated migrator') === false)

      const totalLength = messageLines.reduce<number>((count, line) => {
        return count + line.length
      }, 0)

      const locationPrefix =
        location != null ? `${filePath} @ ${location} -` : `${filePath} -`

      const message = [
        [locationPrefix, ...messageLines].join(totalLength > 100 ? EOL : ' ')
      ]
        .filter((line) => line)
        .join(EOL)

      const level: 'warn' | 'trace' =
        messageLines.some((line) => line.includes('warnings omitted')) === false
          ? 'warn'
          : loggerType === 'pino'
            ? 'trace'
            : 'warn'

      logger.info(message.trim(), {
        name: isDeprecation ? 'sass-deprecation' : 'sass',
        context: span?.context?.trim(),
        stack:
          level === 'trace'
            ? undefined
            : messageLines.length > 1
              ? stack
              : undefined
      })
    }
  }
}

export const makeLogSassError = ({
  logger,
  details
}: {
  logger: PinoLogger
  details?: Record<string, unknown>
}) => {
  return (err: unknown): DevOpsError => {
    if (err instanceof Exception) {
      const { sassStack, span } = err
      logger.error('{message}', {
        ...details,
        span,
        stack: parseSassStack(sassStack),
        message: err.sassMessage
      })
    }

    return new DevOpsError(
      err instanceof Exception
        ? err.sassMessage
        : err instanceof Error
          ? err.message
          : 'Unknown error',
      details
    )
  }
}
