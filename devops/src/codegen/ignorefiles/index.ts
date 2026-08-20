import { writeFile } from 'node:fs/promises'
import Path from 'node:path'
import { DevOpsError } from '../../core/errors/index.js'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { workdir } from '../../core/process/workdir.js'
import { MINUTE_IN_MS } from '../../core/time/constants.js'

const logger = initLogger().with({ name: 'codegen:ignorefiles' })

const baseDirectives = ['assets/', 'pnpm-lock.yaml'] as const

const run = async () => {
  logger.debug('Generating ignore files')

  const { execa } = await import('execa9')

  const result = await execa(
    'fdfind',
    [
      '--search-path',
      '_js',
      '--search-path',
      'assets',
      '--search-path',
      'blocks',
      '--search-path',
      'snippets',
      '--search-path',
      'sections',
      '--type',
      'file',
      '--exec-batch',
      'grep',
      '-l',
      'build-fingerprint',
      '{}',
      // find requires a semicolon to end the command
      ';'
    ],
    { cwd: workdir, timeout: 5 * MINUTE_IN_MS, reject: false, lines: true }
  )

  if (result.failed) {
    logger.error('Failed to generate ignore files: {message}\n{stderr}', {
      message: result.shortMessage,
      stderr: result.stderr.join('\n')
    })
    throw new DevOpsError('Failed to generate ignore files')
  }

  const buildArtefactPaths = result.stdout
    .map((_line) => {
      const line = _line.startsWith(workdir)
        ? _line.slice(workdir.length)
        : _line

      return line
    })
    .sort()
    .filter((path) => {
      return path.startsWith('assets/') ? false : true
    })

  const allDirectives = [...baseDirectives, ...buildArtefactPaths]

  const ignoreFileContents = [
    '# DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:codegen:source={devops/src/codegen/ignorefiles/index.ts}]',
    '',
    ...allDirectives,
    ''
  ].join('\n')

  await writeFile(Path.join(workdir, '.cursorignore'), ignoreFileContents)
  await writeFile(Path.join(workdir, '.aiderignore'), ignoreFileContents)
  await writeFile(Path.join(workdir, '.repomixignore'), ignoreFileContents)

  logger.info('Ignore files written')

  const gitAttributes = [
    '.aiderignore',
    '.cursorignore',
    '.cursorindexingignore',
    '.gitattributes',
    '.gitignore',
    '.repomixignore',
    ...allDirectives
  ].map((directive) => {
    return `${directive} linguist-generated=true merge=ours`
  })

  const gitAttributesContents = [
    '# DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:codegen:source={devops/src/codegen/ignorefiles/index.ts}]',
    '',
    ...gitAttributes,
    ''
  ].join('\n')

  await writeFile(Path.join(workdir, '.gitattributes'), gitAttributesContents)

  logger.info('Git attributes written')
}

run().catch(makeLogErrorDetails(logger))
