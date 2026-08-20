import Path from 'node:path'
import { workdir } from '../../process/workdir.js'
import { ASSET_FILE_PREFIX } from '../../shopify/asset-file-prefix.js'
import { joinNameSegments } from '../../string/join-name-segments.js'
import { MINUTE_IN_MS } from '../../time/constants.js'

type SimpleEntryObject = Record<string, string>

export const discoverSectionEntrypoints =
  async (): Promise<SimpleEntryObject> => {
    const { execa } = await import('execa9')
    const { stdout: _sections } = await execa(
      'fdfind',
      [
        '--color=never',
        '--type=file',
        '--extension=js',
        '--exact-depth=2',
        '--glob',
        'index.js',
        '_js-dist/sections'
      ],
      { cwd: workdir, timeout: 1 * MINUTE_IN_MS }
    )

    const sectionsEntry: SimpleEntryObject = _sections
      .trim()
      .split('\n')
      .reduce<SimpleEntryObject>((acc, path) => {
        if (path.length === 0) {
          return acc
        }

        const sectionName = Path.basename(Path.dirname(path))
        const entryName = joinNameSegments([
          ASSET_FILE_PREFIX,
          'section',
          sectionName
        ])

        acc[entryName] = './' + path
        return acc
      }, {})

    return sectionsEntry
  }
