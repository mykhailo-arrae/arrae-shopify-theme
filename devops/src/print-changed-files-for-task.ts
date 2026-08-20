import Path from 'node:path'
import { parseArgs } from 'node:util'
import { $, argv, stdout } from 'bun'
import { z } from 'devops-zod4'
import pm from 'picomatch'
import { safeAwait } from './core/errors/safe-await.js'
import { inferCommonDirs } from './core/fs/common-dirs.js'
import { listChangedFiles } from './core/git/list-changed-files.js'
import { initLogger } from './core/logger/index.js'
import { makeLogErrorDetails } from './core/logger/log-error-details.js'
import { gitdir } from './core/process/gitdir.js'

const RUN_TASK = 'RUN_TASK'
const SKIP_TASK = 'SKIP_TASK'

const logger = initLogger().with({ name: 'run-with-changed-files' })
const logErrorDetails = makeLogErrorDetails(logger)

const PackageJson = z.object({
  ava: z.object({
    files: z.array(z.string().min(1)).min(1)
  })
})

const Env = z.object({
  COMPARE_TO_REVISION: z.string().min(1).optional().default('origin/main')
})

const Values = z.object({
  task: z.enum([
    'format-json',
    'lint',
    'organize-imports',
    'stylelint',
    'test',
    'themecheck',
    'typecheck'
  ])
})

const matches = (patterns: string[]) => {
  return (file: string) => {
    return pm.isMatch(file, patterns, {
      dot: true,
      cwd: gitdir
    })
  }
}

const matchesByBasename = (pattern: string) => {
  return (file: string) => {
    return pm.matchBase(file, pattern, {
      dot: true,
      cwd: gitdir
    })
  }
}

const run = async () => {
  const { values: _flags } = parseArgs({
    args: argv,
    strict: true,
    options: {
      task: {
        type: 'string',
        short: 't'
      },
      compareWith: {
        type: 'string',
        short: 'c'
      }
    },
    allowPositionals: true
  })

  const [flagsErr, flags] = await safeAwait(Values.parseAsync(_flags))

  if (flagsErr) {
    throw flagsErr
  }

  const [envErr, env] = await safeAwait(Env.parseAsync(process.env))

  if (envErr) {
    throw envErr
  }

  logger.trace({ env, flags })

  const { task } = flags
  const { COMPARE_TO_REVISION: compareWith } = env

  const { isAtHead, files: allFiles } = await listChangedFiles({
    logger,
    compareWith
  })

  logger.trace('Printing changed files for task: {task}', {
    task,
    isAtHead,
    allFiles
  })

  if (task === 'test') {
    if (isAtHead) {
      logger.debug('The branch is equal to the comparison branch')

      const packageJson = await PackageJson.parseAsync(
        await Bun.file(Path.resolve(gitdir, 'package.json')).json()
      )
      await stdout.write(packageJson.ava.files.join('\n'))
      return
    }

    const files = allFiles
      .filter(matchesByBasename('*.{js,jsx,ts,tsx}'))
      .filter(matches(['_js/**/*', 'devops/src/**/*']))

    const dirnames = files.map((file) => {
      return Path.dirname(file)
    })

    if (dirnames.length === 0) {
      logger.debug('No files to test')
      return
    }

    const _testFiles =
      await $`fdfind -t file -e spec.ts ${dirnames.map((d) => `--search-path=${d}`)}`
        .cwd(gitdir)
        .text()

    const testFiles = _testFiles
      .trim()
      .split('\n')
      .filter((line) => line)

    const testFolders = await inferCommonDirs({ paths: testFiles, cwd: gitdir })

    if (testFolders.length === 0) {
      logger.info('No files to test')
      return
    }

    await stdout.write(testFolders.join('\n'))
    return
  }

  if (task === 'lint') {
    if (isAtHead) {
      logger.debug('The branch is equal to the comparison branch')
      await stdout.write('./')
      return
    }

    const files = allFiles.filter(matchesByBasename('*.{js,jsx,ts,tsx}'))

    const dirnames = await inferCommonDirs({ paths: files, cwd: gitdir })

    if (dirnames.length === 0) {
      logger.info('No files to lint')
      return
    }

    await stdout.write(dirnames.join('\n'))
    return
  }

  if (task === 'stylelint') {
    if (isAtHead) {
      logger.debug('The branch is equal to the comparison branch')
      await stdout.write('**/*.scss')
      return
    }

    const files = allFiles.filter(matchesByBasename('*.scss'))

    const dirnames = await inferCommonDirs({ paths: files, cwd: gitdir })

    if (dirnames.length === 0) {
      logger.info('No files to stylelint')
      return
    }

    const stylelintGlobs = dirnames.map((d) => `${d}/**/*.scss`)

    await stdout.write(stylelintGlobs.join('\n'))
    return
  }

  // Themecheck cannot be run on a subset of files
  if (task === 'themecheck') {
    if (isAtHead) {
      logger.debug(
        'The branch is equal to the comparison branch. Running task.'
      )
      await stdout.write(RUN_TASK)
      return
    }

    const files = allFiles.filter(matchesByBasename('*.liquid'))

    if (files.length === 0) {
      logger.info('No changes detected. Skipping task')
      await stdout.write(SKIP_TASK)
      return
    }

    logger.debug('Changes detected. Running task')
    await stdout.write(RUN_TASK)
    return
  }

  // Format JSON cannot be run on a subset of files
  if (task === 'format-json') {
    if (isAtHead) {
      logger.debug(
        'The branch is equal to the comparison branch. Running task.'
      )
      await stdout.write(RUN_TASK)
      return
    }

    const files = allFiles.filter(matchesByBasename('*.json'))

    if (files.length === 0) {
      logger.info('No changes detected. Skipping task')
      await stdout.write(SKIP_TASK)
      return
    }

    logger.debug('Changes detected. Running task')
    await stdout.write(RUN_TASK)
    return
  }

  // Typescript-related tasks cannot be run on a subset of files
  if (task === 'typecheck' || task === 'organize-imports') {
    if (isAtHead) {
      logger.debug(
        'The branch is equal to the comparison branch. Running task.'
      )
      await stdout.write(RUN_TASK)
      return
    }

    const files = allFiles.filter(matchesByBasename('*.{js,jsx,ts,tsx}'))

    if (files.length === 0) {
      logger.info('No changes detected. Skipping task')
      await stdout.write(SKIP_TASK)
      return
    }

    logger.debug('Changes detected. Running task')
    await stdout.write(RUN_TASK)
    return
  }

  task satisfies never
}

run().catch((_err: unknown) => {
  const err = logErrorDetails(_err)

  throw err
})
