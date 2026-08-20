import fs from 'node:fs/promises'
import Path from 'node:path'
import { argv } from 'node:process'
import { parseArgs } from 'node:util'
import { $ } from 'bun'
import { z } from 'devops-zod4'
import picomatch from 'picomatch'
import { format, resolveConfig } from 'prettier'
import { chunk } from 'remeda'
import { safeAwait } from '../../core/errors/safe-await.js'
import { asSubPath } from '../../core/fs/as-subpath.js'
import { inferProjectIgnoreRules } from '../../core/fs/project-ignore-rules.js'
import { listChangedFiles } from '../../core/git/list-changed-files.js'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { inferMaxConcurrency } from '../../core/process/concurrency.js'
import { gitdir } from '../../core/process/gitdir.js'

type Failure = {
  type: 'read' | 'format' | 'write'
  filepath: string
  error: Error
}

type Outcome =
  | { type: 'noop' }
  | {
      type: 'success'
      processedFiles: number
    }
  | {
      type: 'error'
      failures: Failure[]
    }

const logger = initLogger().with({ name: 'prettify-liquid' })
const logErrorDetails = makeLogErrorDetails(logger)

const CliArgs = z.object({
  changedOnly: z.boolean().optional().default(false)
})
type CliArgs = z.infer<typeof CliArgs>

const run = async (): Promise<Outcome> => {
  logger.trace('Retrieving prettier options')

  const prettierOptions = await resolveConfig(
    Path.resolve(gitdir, 'placeholder.liquid')
  )

  const ignoreList = await inferProjectIgnoreRules([
    '.gitignore',
    '.prettierignore'
  ])

  const concurrency = inferMaxConcurrency((totalCores) => totalCores)

  logger.trace('Concurrency: {concurrency}', { concurrency })

  const { values: _args } = parseArgs({
    args: argv,
    strict: true,
    options: {
      changedOnly: {
        type: 'boolean',
        short: 'c'
      }
    } as const satisfies Record<keyof CliArgs, unknown>,
    allowPositionals: true
  })

  const { changedOnly } = await CliArgs.parseAsync(_args)

  const inferFiles = async (): Promise<string[]> => {
    if (changedOnly) {
      const { isAtHead, files: changedFiles } = await listChangedFiles({
        logger,
        compareWith: 'origin/main'
      })

      if (isAtHead) {
        logger.debug('Skipping because the branch is equal to main')
        return []
      }

      return changedFiles
    }

    const allFile$ = $`
fdfind -t file -e liquid --base-directory=${gitdir} --search-path=. --exec-batch rg --files-without-match build-fingerprint | sort -h
`
      .cwd(gitdir)
      .lines()

    const allFiles = await Array.fromAsync(allFile$)

    return allFiles
  }

  const files = await inferFiles().then((_files) => {
    return _files.flatMap((_file) => {
      const file = asSubPath({
        parent: gitdir,
        child: _file.trim(),
        cwd: gitdir
      })

      if (!file) {
        return []
      }

      const isLiquid = picomatch.matchBase(file, '*.liquid', {
        dot: true,
        cwd: gitdir
      })

      if (isLiquid === false) {
        return []
      }

      if (ignoreList.ignores(file)) {
        return []
      }

      return [file]
    })
  })

  if (files.length === 0) {
    return { type: 'noop' }
  }

  logger.trace('Prettifying {count} Liquid files', { count: files.length })

  const failures: Failure[] = []

  const fileChunks = chunk(files, concurrency * 10)

  for (const fileChunk of fileChunks) {
    await Promise.all(
      fileChunk.map(async (filepath): Promise<void> => {
        const [readError, content] = await safeAwait(
          fs.readFile(filepath, { encoding: 'utf-8' })
        )

        if (readError) {
          failures.push({ type: 'read', filepath, error: readError })
          return
        }

        const [prettierError, formatted] = await safeAwait(
          format(content, {
            ...prettierOptions,
            filepath
          })
        )

        if (prettierError) {
          failures.push({ type: 'format', filepath, error: prettierError })
          return
        }

        const [writeError] = await safeAwait(
          fs.writeFile(filepath, formatted, { encoding: 'utf-8' })
        )

        if (writeError) {
          failures.push({ type: 'write', filepath, error: writeError })
          return
        }

        logger.trace('Prettified {filepath}', { filepath })
      })
    )
  }

  if (failures.length > 0) {
    failures.forEach(({ filepath, error }) => {
      logger.error('{filepath}: {message}', {
        filepath,
        message: error.message
      })
    })

    return { type: 'error', failures }
  }

  return { type: 'success', processedFiles: files.length }
}

run()
  .then((outcome) => {
    if (outcome.type === 'error') {
      const { failures } = outcome
      logger.error('Failed to prettify {count} Liquid files', {
        count: failures.length,
        files: failures.map(({ filepath }) => filepath).sort()
      })
      process.exit(1)
    }

    if (outcome.type === 'noop') {
      logger.trace('No Liquid files to prettify')
      return
    }

    logger.info('Prettified {count} Liquid files', {
      count: outcome.processedFiles
    })
  })
  .catch((_err: unknown) => {
    const err = logErrorDetails(_err)
    throw err
  })
