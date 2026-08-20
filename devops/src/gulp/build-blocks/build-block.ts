import fs from 'node:fs/promises'
import Path from 'node:path'
import { glob } from 'tinyglobby'
import { DevOpsError } from '../../core/errors/index.js'
import { initLogger } from '../../core/logger/index.js'
import { themedir } from '../../core/process/themedir.js'
import { workdir } from '../../core/process/workdir.js'
import { makeCssModulesTagProcessor } from '../modules/css-modules-tag/index.js'
import { makeBuildPortableStyles } from '../modules/portable-styles/index.js'
import { FOLDER } from './constants.js'

const logger = initLogger().with({ name: 'build-block' })

type BuildAssetReferenceList = {
  blockCwd: string
  blockName: string
}

const buildAssetReferenceList = async ({
  blockCwd,
  blockName
}: BuildAssetReferenceList): Promise<string | null> => {
  const paths = await glob('index.{js,jsx,ts,tsx}', {
    cwd: blockCwd,
    absolute: true,
    onlyFiles: true
  })

  if (paths.length === 0) {
    logger.trace('No TS entrypoints detected for block {blockName}', {
      blockName
    })
    return null
  }

  if (paths.length > 1) {
    throw new DevOpsError('Duplicate TS entrypoints detected', {
      paths,
      blockName
    })
  }

  const assetUrlScript: string = [
    '<script class="json-portable-block-assets" type="application/json">',
    JSON.stringify({ blockName }),
    '</script>'
  ].join('')

  return assetUrlScript
}

export const buildBlock = async (blockName: string): Promise<void> => {
  const processCssModulesTags = makeCssModulesTagProcessor()
  const buildPortableStyles = await makeBuildPortableStyles({ logger })

  const blockCwd = Path.resolve(workdir, FOLDER, blockName)
  const blockFilepath = Path.resolve(blockCwd, 'block.liquid')

  const rawTemplate = await fs.readFile(blockFilepath, {
    encoding: 'utf-8'
  })

  const cssModulePaths = await glob('style.module.scss', {
    cwd: blockCwd,
    absolute: true,
    onlyFiles: true
  })

  if (cssModulePaths.length > 0) {
    throw new DevOpsError(
      `Filename forbidden, please rename "style.module.scss" to "styles.scss"`,
      { blockName, cssModulePaths }
    )
  }

  const { stylenames, stylesheet, tsModule } = await buildPortableStyles({
    fileLoadPath: blockCwd,
    filename: 'styles.scss',
    moduleName: blockName
  })

  const stylesheetSegment: string | null =
    stylesheet.length > 0
      ? ['<style>', stylesheet, '</style>'].join('\n')
      : null

  const relativePath = Path.relative(workdir, blockFilepath)
  const bannerText = `DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:assets:source={${relativePath}}]`

  const cssModulesTagsResult = processCssModulesTags({
    template: rawTemplate,
    cssModules: stylenames
  })

  if (cssModulesTagsResult.status === 'error') {
    const firstError = cssModulesTagsResult.errors[0]
    logger.error(
      'Failed to process CSS Modules tags in block "{blockName}": {code} at line {line}',
      {
        code: firstError?.code ?? 'UNKNOWN_ERROR',
        line: firstError?.line,
        blockName
      }
    )

    throw new DevOpsError('Failed to process CSS Modules tags', {
      blockName
    })
  }

  if (cssModulesTagsResult.warnings.length > 0) {
    logger.warn(
      [
        '"{blockName}" - CSS Modules tag warnings:',
        ...cssModulesTagsResult.warnings.map((warning) => {
          return `  - ${warning.code} - "${warning.identifier}" at line ${warning.line}`
        })
      ].join('\n'),
      {
        blockName
      }
    )
  }

  const template =
    [
      `{% # ${bannerText} %}`,
      await buildAssetReferenceList({ blockCwd, blockName }),
      stylesheetSegment,
      cssModulesTagsResult.output
    ]
      .flatMap((segment) => {
        if (!segment) {
          return []
        }

        return [segment.trim()]
      })
      .join('\n\n') + '\n'

  const fsOps = await Promise.allSettled([
    fs.writeFile(
      Path.resolve(themedir, './blocks', `./${blockName}.liquid`),
      template
    ),
    fs.writeFile(Path.resolve(blockCwd, 'styles.scss.ts'), tsModule)
  ])

  fsOps.forEach((result) => {
    if (result.status === 'rejected') {
      throw new DevOpsError('File operation failed', {
        blockName,
        err: result.reason,
        traceTag: 'a3b7e2c1d4f64a8e9b5c0d1e2f3a4b5c'
      })
    }
  })
}
