import { DevOpsError } from '../../../core/errors/index.js'
import type { Logger } from '../../../core/logger/index.js'
import { gitdir } from '../../../core/process/gitdir.js'
import type { ContentOverridePatterns } from './schema.js'

export const validateContentOverridePatterns = async ({
  logger,
  patterns
}: {
  logger: Logger
  patterns: ContentOverridePatterns
}): Promise<void> => {
  const { execa } = await import('execa9')

  if (patterns.length === 0) {
    logger.debug('No content override patterns to validate')
    return
  }

  logger.trace('Validating content override patterns', { patterns })

  for (const pattern of patterns) {
    const result = await execa('git', ['ls-files', '--', pattern], {
      cwd: gitdir,
      lines: true,
      reject: false
    })

    if (result.failed) {
      result.stderr.forEach((line) => {
        logger.error(line)
      })

      logger.error('Content override pattern is invalid: {pattern}', {
        pattern,
        allPatterns: patterns
      })

      throw new DevOpsError('Content override pattern is invalid', {
        pattern,
        traceTag: '7324b845c79b449fb2ecf0c7ba075840'
      })
    }
  }

  logger.info('All content override patterns are valid')
}
