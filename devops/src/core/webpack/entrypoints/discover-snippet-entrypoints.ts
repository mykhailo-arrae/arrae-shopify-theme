import fs from 'node:fs/promises'
import Path from 'node:path'
import { DevOpsError } from '../../errors/index.js'
import { workdir } from '../../process/workdir.js'
import { ASSET_FILE_PREFIX } from '../../shopify/asset-file-prefix.js'
import { Snippet } from '../../shopify/snippets/schema.js'
import { joinNameSegments } from '../../string/join-name-segments.js'
import { MINUTE_IN_MS } from '../../time/constants.js'

type SimpleEntryObject = Record<string, string>

export const discoverSnippetEntrypoints =
  async (): Promise<SimpleEntryObject> => {
    const { execa } = await import('execa9')
    const { stdout } = await execa(
      'fdfind',
      [
        '--color=never',
        '--type=file',
        '--extension=js',
        '--exact-depth=2',
        '--glob',
        'index.js',
        '_js-dist/snippets'
      ],
      { cwd: workdir, timeout: 1 * MINUTE_IN_MS }
    )

    const _snippets: string[] = stdout
      .trim()
      .split('\n')
      .filter((p) => p.length > 0)

    const snippets = new Set<string>()

    for (const snippetPath of _snippets) {
      const schemaPath = Path.join(
        workdir,
        Path.dirname(snippetPath),
        'schema.json'
      )

      let _schema: JSONValue = null

      try {
        _schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'))
      } catch (err) {
        throw new DevOpsError('Snippet schema cannot be read', {
          err,
          schemaPath,
          snippetPath
        })
      }

      const result = await Snippet.safeParseAsync(_schema)

      if (result.success === false) {
        throw new DevOpsError('Snippet schema is invalid', {
          err: result.error,
          schemaPath,
          snippetPath
        })
      }

      const { data: schema } = result

      if (schema.type === 'static') {
        throw new DevOpsError('Snippet schema type should be dynamic', {
          schema,
          schemaPath,
          snippetPath
        })
      }

      snippets.add(snippetPath)
    }

    const snippetsEntry = Array.from(snippets).reduce<SimpleEntryObject>(
      (acc, path) => {
        if (path.length === 0) {
          return acc
        }

        const snippetName = Path.basename(Path.dirname(path))
        const entryName = joinNameSegments([
          ASSET_FILE_PREFIX,
          'snippet',
          snippetName
        ])

        acc[entryName] = './' + path
        return acc
      },
      {}
    )

    return snippetsEntry
  }
