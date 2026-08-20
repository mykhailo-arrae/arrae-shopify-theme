import fs from 'node:fs/promises'
import Path from 'node:path'
import { argv } from 'node:process'
import { DevOpsError } from '../../core/errors/index.js'
import { checkFileCanBeRead } from '../../core/fs/check-file-access.js'
import { initLogger } from '../../core/logger/index.js'
import { makeHandleRejection } from '../../core/process/handle-rejection.js'
import { workdir } from '../../core/process/workdir.js'
import { makeBuildPortableStyles } from '../../gulp/modules/portable-styles/index.js'

const logger = initLogger().with({ name: 'codegen-portable-styles' })

const run = async (): Promise<void> => {
  const [, , ..._filepaths] = argv

  const filepaths = _filepaths.filter((filepath) => {
    return filepath
  })

  if (filepaths.length === 0) {
    throw new DevOpsError('No file paths provided', { argv })
  }

  const buildPortableStyles = await makeBuildPortableStyles({
    logger,
    silent: true
  })

  const codegen = async (_filepath: string): Promise<void> => {
    const filepath = Path.isAbsolute(_filepath)
      ? _filepath
      : Path.resolve(workdir, _filepath)

    const fileExists = await checkFileCanBeRead(filepath)

    if (fileExists === false) {
      logger.fatal("File doesn't exist: {filepath}", { filepath })

      throw new DevOpsError('File not found')
    }

    const filename = Path.basename(filepath)
    const fileLoadPath = Path.dirname(filepath)

    const moduleName = fileLoadPath.split(Path.sep).at(-1)

    if (moduleName == null) {
      throw new DevOpsError('Module name is invalid', { filepath })
    }

    const { tsModule } = await buildPortableStyles({
      fileLoadPath,
      filename,
      moduleName
    })

    await fs.writeFile(Path.resolve(fileLoadPath, filename + '.ts'), tsModule)
  }

  const results = await Promise.allSettled(filepaths.map(codegen))

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.error(
        'Failed to generate TS companion file for portable styles: {filepath}',
        {
          filepath: filepaths.at(index),
          err: result.reason
        }
      )
    }
  })

  const hasErrors = results.some((result) => result.status === 'rejected')

  if (hasErrors) {
    throw new DevOpsError('Some files cannot be processed')
  }

  logger.info('{count} files processed', { count: results.length })
}

run().catch(makeHandleRejection({ logger }))
