import Path from 'node:path'
import { workdir } from '../../process/workdir.js'
import { ASSET_FILE_PREFIX } from '../../shopify/asset-file-prefix.js'
import { joinNameSegments } from '../../string/join-name-segments.js'
import { MINUTE_IN_MS } from '../../time/constants.js'

type SimpleEntryObject = Record<string, string>

export const discoverBlockEntrypoints =
  async (): Promise<SimpleEntryObject> => {
    const { execa } = await import('execa9')
    const { stdout: _blocks } = await execa(
      'fdfind',
      [
        '--color=never',
        '--type=file',
        '--extension=js',
        '--exact-depth=2',
        '--glob',
        'index.js',
        '_js-dist/blocks'
      ],
      { cwd: workdir, timeout: 1 * MINUTE_IN_MS }
    )

    const blocksEntry: SimpleEntryObject = _blocks
      .trim()
      .split('\n')
      .reduce<SimpleEntryObject>((acc, path) => {
        if (path.length === 0) {
          return acc
        }

        const blockName = Path.basename(Path.dirname(path))
        const entryName = joinNameSegments([
          ASSET_FILE_PREFIX,
          'block',
          blockName
        ])

        acc[entryName] = './' + path
        return acc
      }, {})

    return blocksEntry
  }
