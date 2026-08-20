import fs from 'node:fs/promises'
import Path from 'node:path'
import { DevOpsError } from '../../core/errors/index.js'
import type { Logger } from '../../core/logger/index.js'
import { workdir } from '../../core/process/workdir.js'

export const createSectionFolder = async ({
  logger,
  sectionName
}: {
  logger: Logger
  sectionName: string
}): Promise<void> => {
  const sectionPath = Path.resolve(workdir, '_js/sections', sectionName)
  try {
    await fs.mkdir(sectionPath).catch(async (err: unknown) => {
      const stat = await fs.stat(sectionPath)

      if (stat.isDirectory()) {
        logger.debug('Section folder already exists: {sectionPath}', {
          sectionPath
        })
        return
      }
      throw err
    })
  } catch (err) {
    throw new DevOpsError('Failed to create section folder', {
      err,
      path: sectionPath
    })
  }
}
