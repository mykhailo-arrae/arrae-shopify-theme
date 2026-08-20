import { initLogger, type Level } from './index.js'

export const makeDevOpsConsole = (): Console => {
  const logger = initLogger()

  const makeLog = (level: Level) => {
    return (...args: unknown[]): void => {
      if (args.length === 0) {
        return
      }

      if (args.every((arg) => typeof arg === 'string')) {
        logger[level](args.join('\n'))
        return
      }

      const [message, ...details] = args

      logger[level]('{message}', { message, details })
    }
  }

  const DevOpsConsole = {
    ...console,
    debug: makeLog('debug'),
    dir: makeLog('debug'),
    error: makeLog('error'),
    info: makeLog('info'),
    log: makeLog('info'),
    trace: makeLog('trace'),
    warn: makeLog('warning')
  } satisfies typeof console

  return DevOpsConsole
}
