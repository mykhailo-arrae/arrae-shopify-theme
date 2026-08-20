import fs from 'node:fs/promises'
import Path from 'node:path'
import { DevOpsError } from '../../core/errors/index.js'
import type { Logger } from '../../core/logger/index.js'
import { workdir } from '../../core/process/workdir.js'

export const createBlockFolder = async ({
  logger,
  blockName
}: {
  logger: Logger
  blockName: string
}): Promise<void> => {
  const blockPath = Path.resolve(workdir, '_js/blocks', blockName)
  try {
    await fs.mkdir(blockPath).catch(async (err: unknown) => {
      const stat = await fs.stat(blockPath)

      if (stat.isDirectory()) {
        logger.debug('Block folder already exists: {blockPath}', {
          blockPath
        })
        return
      }
      throw err
    })
  } catch (err) {
    throw new DevOpsError('Failed to create block folder', {
      err,
      path: blockPath
    })
  }
}
