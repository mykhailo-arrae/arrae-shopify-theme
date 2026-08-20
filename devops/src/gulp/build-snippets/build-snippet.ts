import fs from 'node:fs/promises'
import Path from 'node:path'
import { glob } from 'tinyglobby'
import { DevOpsError } from '../../core/errors/index.js'
import { checkFileCanBeRead } from '../../core/fs/check-file-access.js'
import { initLogger } from '../../core/logger/index.js'
import { themedir } from '../../core/process/themedir.js'
import { workdir } from '../../core/process/workdir.js'
import { Snippet } from '../../core/shopify/snippets/schema.js'
import { isPresent } from '../../core/typescript/is-present.js'
import { makeCssModulesTagProcessor } from '../modules/css-modules-tag/index.js'
import { makeBuildPortableStyles } from '../modules/portable-styles/index.js'
import { FOLDER } from './constants.js'
import { generateContainerClassnames } from './generate-container-classnames.js'

const logger = initLogger().with({ name: 'build-snippet' })

const readSnippetSchema = async ({
  snippetWorkdir
}: {
  snippetWorkdir: string
}): Promise<Snippet> => {
  try {
    const filepath = Path.resolve(snippetWorkdir, 'schema.json')

    const __schema = await fs
      .readFile(filepath, { encoding: 'utf-8' })
      .catch((err: unknown) => {
        if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
          return null
        }

        throw err
      })

    // If the file does not exist, return default static schema
    if (__schema == null) {
      return {
        type: 'static',
        stylesheet: 'external'
      } satisfies Snippet
    }

    const _schema = JSON.parse(__schema)
    const schema = await Snippet.parseAsync(_schema)

    return schema
  } catch (err) {
    throw new DevOpsError('Snippet schema is invalid', {
      err,
      traceTag: '68aa79bdc1f74daf85e84839f9260581'
    })
  }
}

const checkTsEntrypointExists = async ({
  snippetWorkdir
}: {
  snippetWorkdir: string
}): Promise<boolean> => {
  const entrypointExists: boolean =
    (await checkFileCanBeRead(Path.resolve(snippetWorkdir, 'index.tsx'))) ||
    (await checkFileCanBeRead(Path.resolve(snippetWorkdir, 'index.ts'))) ||
    (await checkFileCanBeRead(Path.resolve(snippetWorkdir, 'index.jsx'))) ||
    (await checkFileCanBeRead(Path.resolve(snippetWorkdir, 'index.js')))

  return entrypointExists
}

export const buildSnippet = async (snippetName: string): Promise<void> => {
  const processCssModulesTags = makeCssModulesTagProcessor()
  const buildPortableStyles = await makeBuildPortableStyles({ logger })

  const snippetWorkdir = Path.resolve(workdir, FOLDER, snippetName)
  const snippetFilepath = Path.resolve(snippetWorkdir, 'snippet.liquid')

  const schema = await readSnippetSchema({ snippetWorkdir })
  const tsEntrypointExists = await checkTsEntrypointExists({ snippetWorkdir })

  if (tsEntrypointExists && schema.type === 'static') {
    throw new DevOpsError(
      'Static snippet cannot have a TypeScript entrypoint, please amend or create the schema.json file',
      { schema, snippet: snippetName }
    )
  }

  if (tsEntrypointExists === false && schema.type === 'dynamic') {
    throw new DevOpsError(
      'Dynamic snippet should have a TypeScript entrypoint, please create the index.tsx file',
      { schema, snippet: snippetName }
    )
  }

  const rawTemplate = await fs.readFile(snippetFilepath, {
    encoding: 'utf-8'
  })

  const cssModulePaths = await glob('style.module.scss', {
    cwd: snippetWorkdir,
    absolute: true,
    onlyFiles: true
  })

  if (cssModulePaths.length > 0) {
    throw new DevOpsError(
      `Filename forbidden, please rename "style.module.scss" to "styles.scss"`,
      { snippetName, cssModulePaths }
    )
  }

  const { stylenames, stylesheet, tsModule } = await buildPortableStyles({
    fileLoadPath: snippetWorkdir,
    filename: 'styles.scss',
    moduleName: snippetName
  })

  const cssModulesTagsResult = processCssModulesTags({
    template: rawTemplate,
    cssModules: stylenames
  })

  if (cssModulesTagsResult.status === 'error') {
    const firstError = cssModulesTagsResult.errors[0]
    logger.error(
      'Failed to process CSS Modules tags in snippet "{snippetName}": {code} at line {line}',
      {
        code: firstError?.code ?? 'UNKNOWN_ERROR',
        line: firstError?.line,
        snippetName
      }
    )

    throw new DevOpsError('Failed to process CSS Modules tags', {
      snippetName
    })
  }

  if (cssModulesTagsResult.warnings.length > 0) {
    logger.warn(
      [
        '"{snippetName}" - CSS Modules tag warnings:',
        ...cssModulesTagsResult.warnings.map((warning) => {
          return `  - ${warning.code} - "${warning.identifier}" at line ${warning.line}`
        })
      ].join('\n'),
      {
        snippetName
      }
    )
  }

  const relativePath = Path.relative(workdir, snippetFilepath)
  const bannerText = `DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:assets:source={${relativePath}}]`

  const templateParts: (string | null)[] = [
    `{% # ${bannerText} %}`,
    schema.type === 'dynamic'
      ? `<${schema.tag} class="${generateContainerClassnames(
          schema.class,
          stylenames
        )}" data-snippet-name=${JSON.stringify(snippetName)}>`
      : null,
    schema.stylesheet === 'inline' && stylesheet.length
      ? ['<style>', stylesheet, '</style>'].join('\n')
      : null,
    cssModulesTagsResult.output.trim(),
    schema.type === 'dynamic' ? `</${schema.tag}>` : null
  ]

  const template = [templateParts.filter(isPresent).join('\n\n'), ''].join('\n')

  const writeCompanionTemplate = async (): Promise<void> => {
    if (schema.stylesheet === 'inline') {
      return
    }

    schema.stylesheet satisfies 'external'

    if (stylesheet.length === 0) {
      logger.trace(
        'Stylesheet is empty, skipping companion template for {snippetName}',
        { snippetName }
      )
      return
    }

    const styleSourcePath = Path.relative(
      workdir,
      Path.resolve(workdir, snippetWorkdir, 'styles.scss')
    )
    const companionBannerText = `DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:assets:source={${styleSourcePath}}]`

    const companionTemplate = [
      `{% # ${companionBannerText} %}`,
      '<style>',
      `/* Companion stylesheet for ${JSON.stringify(snippetName)} snippet */`,
      stylesheet,
      '</style>',
      ''
    ].join('\n')

    await fs.writeFile(
      Path.resolve(
        themedir,
        './snippets',
        `./${snippetName}-stylesheet.liquid`
      ),
      companionTemplate
    )
  }

  const fsOps = await Promise.allSettled([
    fs.writeFile(
      Path.resolve(themedir, './snippets', `./${snippetName}.liquid`),
      template
    ),
    writeCompanionTemplate(),
    fs.writeFile(Path.resolve(snippetWorkdir, 'styles.scss.ts'), tsModule)
  ])

  fsOps.forEach((result) => {
    if (result.status === 'fulfilled') {
      return
    }

    const err: unknown = result.reason
    const message = err instanceof Error ? err.message : 'Unknown error'

    throw new DevOpsError(`File operation failed: ${message}`, {
      err,
      snippetName,
      traceTag: 'ec082f748b694be1bb77b7afe556f49d'
    })
  })
}
