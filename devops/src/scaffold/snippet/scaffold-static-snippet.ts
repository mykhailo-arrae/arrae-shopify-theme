import fs from 'node:fs/promises'
import Path from 'node:path'
import prettier from 'prettier'
import { DevOpsError } from '../../core/errors/index.js'
import type { Logger } from '../../core/logger/index.js'
import { workdir } from '../../core/process/workdir.js'
import type { StaticSnippet } from '../../core/shopify/snippets/schema.js'
import { createSnippetFolder } from './create-folder.js'

export const scaffoldStaticSnippet = async ({
  logger,
  snippetName,
  schema
}: {
  logger: Logger
  snippetName: string
  schema: StaticSnippet
}): Promise<void> => {
  logger.debug('Scaffolding static snippet: {snippetName}', {
    snippetName,
    schema
  })

  const prettierOptions = await prettier.resolveConfig(
    Path.resolve(workdir, 'placeholder.ts')
  )

  if (prettierOptions == null) {
    throw new DevOpsError('Prettier config not found', {
      traceTag: '715a61135e6143f79eefe5479d1d3a05'
    })
  }

  logger.trace('Creating snippet folder')
  await createSnippetFolder({ logger, snippetName })

  const snippetWorkdir = Path.resolve(workdir, '_js/snippets', snippetName)

  logger.trace('Creating schema file')
  const schemaContent = await prettier.format(JSON.stringify(schema, null, 2), {
    ...prettierOptions,
    parser: 'json'
  })
  await fs.writeFile(Path.resolve(snippetWorkdir, 'schema.json'), schemaContent)

  logger.trace('Creating CSS module')
  const _cssModule = `.root { background: white; } .heading { color: red; }`
  const cssModule = await prettier.format(_cssModule, {
    ...prettierOptions,
    parser: 'scss'
  })
  await fs.writeFile(Path.resolve(snippetWorkdir, 'styles.scss'), cssModule)

  logger.trace('Creating snippet file')
  const template = [
    `<div class="{# style root #}">`,
    `  <h1 class="{# style heading #}">Hello, world!</h1>`,
    `</div>`,
    ''
  ].join('\n')
  await fs.writeFile(Path.resolve(snippetWorkdir, 'snippet.liquid'), template)

  logger.info('Snippet structure created')
}
