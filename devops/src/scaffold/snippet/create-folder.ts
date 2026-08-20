import fs from 'node:fs/promises'
import Path from 'node:path'
import { DevOpsError } from '../../core/errors/index.js'
import type { Logger } from '../../core/logger/index.js'
import { workdir } from '../../core/process/workdir.js'

export const createSnippetFolder = async ({
  logger,
  snippetName
}: {
  logger: Logger
  snippetName: string
}): Promise<void> => {
  const snippetPath = Path.resolve(workdir, '_js/snippets', snippetName)
  try {
    await fs.mkdir(snippetPath).catch(async (err: unknown) => {
      const stat = await fs.stat(snippetPath)

      if (stat.isDirectory()) {
        logger.debug('Snippet folder already exists: {snippetPath}', {
          snippetPath
        })
        return
      }
      throw err
    })
  } catch (err) {
    throw new DevOpsError('Failed to create snippet folder', {
      err,
      path: snippetPath
    })
  }
}
