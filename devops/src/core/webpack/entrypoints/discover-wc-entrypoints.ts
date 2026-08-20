import Path from 'node:path'
import { workdir } from '../../process/workdir.js'
import { ASSET_FILE_PREFIX } from '../../shopify/asset-file-prefix.js'
import { joinNameSegments } from '../../string/join-name-segments.js'
import { MINUTE_IN_MS } from '../../time/constants.js'
import { parseWebComponentName } from '../../web-components/parse-wc-name.js'

type SimpleEntryObject = Record<string, string>

export const discoverWebComponentEntrypoints =
  async (): Promise<SimpleEntryObject> => {
    const { execa } = await import('execa9')
    const { stdout: _wc } = await execa(
      'fdfind',
      [
        '--color=never',
        '--type=file',
        '--extension=js',
        '--exact-depth=2',
        '--glob',
        'index.js',
        '_js-dist/web-components'
      ],
      { cwd: workdir, timeout: 1 * MINUTE_IN_MS }
    )

    const wcEntry: SimpleEntryObject = _wc
      .trim()
      .split('\n')
      .reduce<SimpleEntryObject>((acc, path) => {
        if (path.length === 0) {
          return acc
        }

        const _wcName = Path.basename(Path.dirname(path))
        const wcName = parseWebComponentName(_wcName)
        const entryName = joinNameSegments([ASSET_FILE_PREFIX, 'wc', wcName])

        acc[entryName] = './' + path
        return acc
      }, {})

    return wcEntry
  }
