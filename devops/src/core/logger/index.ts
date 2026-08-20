import {
  configureSync,
  getConsoleSink,
  getLogger,
  type Logger,
  type LogRecord
} from '@logtape/logtape'
import { prettyConsoleFormatter } from './pretty-console/index.js'

export type { Logger, LogLevel as Level } from '@logtape/logtape'

export const shouldBeVerbose = (): boolean => {
  const ci: boolean = process.env.CI === 'true' || process.env.CI === '1'

  if (ci) {
    return true
  }

  const debug: boolean =
    typeof process.env.DEBUG === 'string' &&
    process.env.DEBUG.length > 0 &&
    process.env.DEBUG !== '0' &&
    process.env.DEBUG !== 'false'

  return debug
}

let logger: Logger | null = null

export const initLogger = (): Logger => {
  if (logger) {
    return logger
  }

  configureSync({
    loggers: [
      // LogTape internal logs. Keep the simplest formatter.
      {
        category: ['logtape', 'meta'],
        sinks: ['jsonConsole'],
        lowestLevel: 'warning'
      },
      {
        category: ['devops'],
        lowestLevel: shouldBeVerbose() ? 'trace' : 'debug',
        sinks: ['prettyConsole']
      }
    ],
    sinks: {
      jsonConsole: getConsoleSink({
        formatter: (record: LogRecord) => {
          return JSON.stringify(record)
        }
      }),
      prettyConsole: (record: LogRecord) => {
        const line = prettyConsoleFormatter(record)
        process.stderr.write(line + '\n')
      }
    }
  })

  logger = getLogger(['devops'])

  return logger
}
