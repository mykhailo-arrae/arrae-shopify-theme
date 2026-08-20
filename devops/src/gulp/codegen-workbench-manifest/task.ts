import fs from 'node:fs/promises'
import Path from 'node:path'
import { sort } from 'fast-sort'
import { glob } from 'glob'
import type { Task } from '../../core/fs/watcher/with-file-changes.js'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { themedir } from '../../core/process/themedir.js'

const NAME = 'codegen-workbench-manifest'

const logger = initLogger().with({ name: NAME })
const logErrorDetails = makeLogErrorDetails(logger)

type WorkbenchManifest = {
  __typename: 'WorkbenchManifest'
  sections: string[]
  templates: { name: string; suffix: string }[]
}

export const codegenWorkbenchManifestTask: Task = {
  name: NAME,
  exec: async (): Promise<void> => {
    try {
      const sections = await glob('./sections/*.liquid', {
        cwd: themedir,
        nodir: true,
        signal: AbortSignal.timeout(10_000)
      }).then((paths) => {
        logger.trace('{count} sections found', { count: paths.length })

        const names = paths.flatMap((path): string[] => {
          const name = Path.basename(path, '.liquid')

          return name.startsWith('workbench') ? [] : [name]
        })

        return sort(names).asc()
      })

      const templates = await glob('./templates/*.*.json', {
        cwd: themedir,
        nodir: true,
        signal: AbortSignal.timeout(10_000)
      }).then((paths) => {
        logger.trace('{count} templates found', { count: paths.length })

        const entries = paths.flatMap(
          (path): { name: string; suffix: string }[] => {
            const basename = Path.basename(path, '.json')

            const [name, suffix] = basename.split('.')

            if (!name || !suffix) {
              return []
            }

            return suffix.startsWith('workbench') ? [] : [{ name, suffix }]
          }
        )

        return sort(entries).asc([
          (entry) => entry.name,
          (entry) => entry.suffix
        ])
      })

      const manifest = {
        __typename: 'WorkbenchManifest',
        sections,
        templates
      } satisfies WorkbenchManifest

      // We split the banner to ensure git doesn't think this module is an artifact
      const fileBanner = [
        '{% # DO NOT EDIT: This file is auto-generated and will be overwritten. [build',
        '-fingerprint:codegen] %}'
      ].join('')

      const fileContents: string = [
        fileBanner,
        '<script class="json-workbench-manifest" type="application/json">',
        JSON.stringify(manifest, null, 2),
        '</script>',
        ''
      ].join('\n')

      await fs.writeFile(
        Path.resolve(themedir, './snippets/workbench-manifest.liquid'),
        fileContents
      )

      logger.info('Workbench manifest generated')
    } catch (_err) {
      const err = logErrorDetails(_err)

      throw err
    }
  }
}

export const codegenWorkbenchManifest = async (): Promise<void> => {
  await codegenWorkbenchManifestTask.exec()
}
