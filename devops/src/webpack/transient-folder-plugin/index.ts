import Path from 'node:path'
import type { RspackPluginFunction } from '@rspack/core'
import { DevOpsError } from '../../core/errors/index.js'
import { initLogger } from '../../core/logger/index.js'
import { workdir } from '../../core/process/workdir.js'
import { MINUTE_IN_MS } from '../../core/time/constants.js'

const cleanupLines = (text = ''): string[] => {
  const lineLengthWarningRe = /WARN: Output exceeds.*?characters/gi

  return text
    .split('\n')
    .map((line) => line.replace(lineLengthWarningRe, ''))
    .filter((line) => line)
}

// See devops/bin/minify-js.sh shell script
export const RAW_OUTPUT_PATH = '/tmp/webpack_raw_2becf6f6'

export const TransientFolderPlugin: RspackPluginFunction = (compiler) => {
  const logger = initLogger().with({ name: 'transient-folder-plugin' })

  compiler.hooks.beforeCompile.tapPromise(
    'TransientFolderPluginBeforeCompile',
    async (): Promise<void> => {
      const { $, ExecaError } = await import('execa9')

      try {
        logger.trace('Preparing transient folder...')
        await $('mkdir', ['-p', RAW_OUTPUT_PATH])
        await $('rm', ['-rf', Path.resolve(RAW_OUTPUT_PATH, '*')])
        logger.info('Transient folder prepared successfully')
      } catch (err) {
        if (err instanceof ExecaError) {
          const { shortMessage, stdout, stderr } = err

          cleanupLines(stdout).forEach((line) => {
            logger.trace(line)
          })

          cleanupLines([stderr, shortMessage].join('\n')).forEach((line) => {
            logger.error(line)
          })
        }

        throw new DevOpsError('Transient emit folder cannot be initialized')
      }
    }
  )

  compiler.hooks.afterEmit.tapPromise(
    'TransientFolderPluginAfterEmit',
    async (): Promise<void> => {
      const { execa } = await import('execa9')

      logger.trace('Copying minified files to assets folder...')

      const result = await execa(Path.resolve(__dirname, './minify-js.sh'), {
        cwd: workdir,
        lines: true,
        reject: false,
        timeout: 5 * MINUTE_IN_MS
      })

      result.stdout.forEach((line) => {
        cleanupLines(line).forEach((l) => {
          logger.trace(l)
        })
      })

      const stderrLogLevel = result.failed ? 'warn' : 'debug'

      result.stderr.forEach((line) => {
        cleanupLines(line).forEach((l) => {
          logger[stderrLogLevel](l)
        })
      })

      if (result.failed) {
        const { shortMessage } = result

        cleanupLines(shortMessage).forEach((line) => {
          logger.error(line)
        })

        throw new DevOpsError('Failed to copy minified files to assets folder')
      }

      logger.info('Copied minified files to assets folder successfully')
    }
  )
}
