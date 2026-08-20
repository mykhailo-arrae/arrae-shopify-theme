import type { Compiler, MultiCompiler, MultiStats, Stats } from '@rspack/core'
import { DevOpsError } from '../core/errors/index.js'
import type { Logger } from '../core/logger/index.js'

type Callback = (
  err: Error | null,
  stats: MultiStats | Stats | null | undefined
) => void

export const makeReporter = ({
  compiler,
  mode = 'build',
  logger,
  resolve: _resolve,
  reject: _reject
}: {
  compiler: Compiler | MultiCompiler
  mode: 'watch' | 'build'
  logger: Logger
  resolve: () => void
  reject: (reason?: unknown) => void
}): Callback => {
  let prevHash: string | null = null

  // Avoid short-circuiting the runtime cycle in watch mode
  const finish = (err?: Error | null): void => {
    if (mode === 'build') {
      compiler.close((closeErr) => {
        if (closeErr) {
          logger.warn('Failed to close compiler', { err: closeErr })
          return
        }
        logger.trace('Compiler closed')
      })
    }

    if (err == null) {
      if (mode === 'watch') {
        return
      }

      _resolve()
      return
    }

    if (mode === 'watch') {
      logger.error('Build failed', { err })
      return
    }

    _reject(
      new DevOpsError('Build failed', {
        err
      })
    )
  }

  return (
    err: Error | null,
    stats: MultiStats | Stats | null | undefined
  ): void => {
    if (err) {
      finish(
        new DevOpsError('Build failed', {
          err
        })
      )
      return
    }

    if (stats == null) {
      logger.info('Build completed')
      finish()
      return
    }

    const hashChanged: boolean = stats.hash !== prevHash

    if (hashChanged) {
      prevHash = stats.hash
      logger.trace('Compilation hash: {hash}', { hash: stats.hash })
    }

    const result = stats.toJson({
      errors: true,
      warnings: true
    })

    if (hashChanged) {
      result.warnings?.forEach(({ message: _message, code }) => {
        const message =
          code === 'ModuleWarning'
            ? _message.split('\n').slice(1).join('\n').trim()
            : _message

        logger.warn(message || _message)
      })
    }

    result.errors?.forEach(({ message, ...details }) => {
      logger.error(message, details)
    })

    const firstError = result.errors?.[0]?.message

    logger.info('Build completed')
    finish(firstError ? new DevOpsError(firstError) : null)
  }
}
