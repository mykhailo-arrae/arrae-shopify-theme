import fs from 'node:fs/promises'
import Path from 'node:path'
import prettier from 'prettier'
import { DevOpsError } from '../../core/errors/index.js'
import type { Logger } from '../../core/logger/index.js'
import { workdir } from '../../core/process/workdir.js'
import type { DynamicSnippet } from '../../core/shopify/snippets/schema.js'
import { createSnippetFolder } from './create-folder.js'

export const scaffoldDynamicSnippet = async ({
  logger,
  snippetName,
  schema: _schema
}: {
  logger: Logger
  snippetName: string
  schema: DynamicSnippet
}): Promise<void> => {
  logger.debug('Scaffolding dynamic snippet: {snippetName}', {
    snippetName,
    schema: _schema
  })

  const prettierOptions = await prettier.resolveConfig(
    Path.resolve(workdir, 'placeholder.ts')
  )

  if (prettierOptions == null) {
    throw new DevOpsError('Prettier config not found', {
      traceTag: 'daa2766edc2a4b0a88e26679923fd4b3'
    })
  }

  logger.trace('Creating snippet folder')
  await createSnippetFolder({ logger, snippetName })

  const snippetWorkdir = Path.resolve(workdir, '_js/snippets', snippetName)

  logger.trace('Creating schema file')
  const schema: DynamicSnippet = {
    ..._schema,
    class: [..._schema.class, 'snippet']
  }
  const schemaContent = await prettier.format(JSON.stringify(schema, null, 2), {
    ...prettierOptions,
    parser: 'json'
  })
  await fs.writeFile(Path.resolve(snippetWorkdir, 'schema.json'), schemaContent)

  logger.trace('Creating TS entrypoint')
  const _entrypointTemplate = `
  import { makeEventNamespace } from '../../core/dom/events/index.js';
  import { initSnippet } from '../../core/shopify/init-snippet/index.js';

  initSnippet('${snippetName}', (snippet) => {
    const namespace = makeEventNamespace();

    namespace.addDelegatedEventListener(snippet, '.js-cta', 'click', (target) => {
      console.log('Button clicked:', target);
    })

    console.log('Snippet initialized:', snippet);

    return () => {
      console.log('Cleaning up snippet:', snippet);
      namespace.destroy();
    }
  });
  `
  const entrypointTemplate = await prettier.format(_entrypointTemplate, {
    ...prettierOptions,
    parser: 'typescript'
  })
  await fs.writeFile(
    Path.resolve(snippetWorkdir, 'index.tsx'),
    entrypointTemplate,
    { encoding: 'utf-8' }
  )

  logger.trace('Creating CSS module')
  const _cssModule = `.snippet { background: blue; } .root { background: white; } .heading { color: red; } .cta { border: 2px solid red; }`
  const cssModule = await prettier.format(_cssModule, {
    ...prettierOptions,
    parser: 'scss'
  })
  await fs.writeFile(Path.resolve(snippetWorkdir, 'styles.scss'), cssModule)

  logger.trace('Creating snippet file')
  const template = [
    `<div class="{# style root #}">`,
    `  <h1 class="{# style heading #}">Hello, world!</h1>`,
    `  <button class="js-cta {# style cta #}" type="button">Click me</button>`,
    `</div>`,
    ''
  ].join('\n')

  await fs.writeFile(Path.resolve(snippetWorkdir, 'snippet.liquid'), template)

  logger.info('Snippet structure created')
}
