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

const logger = initLogger().with({ name: 'build-section' })

type BuildAssetReferenceList = {
  sectionCwd: string
  sectionName: string
}

const buildAssetReferenceList = async ({
  sectionCwd,
  sectionName
}: BuildAssetReferenceList): Promise<string | null> => {
  const paths = await glob('index.{js,jsx,ts,tsx}', {
    cwd: sectionCwd,
    absolute: true,
    onlyFiles: true
  })

  if (paths.length === 0) {
    logger.trace('No TS entrypoints detected for section {sectionName}', {
      sectionName
    })
    return null
  }

  if (paths.length > 1) {
    throw new DevOpsError('Duplicate TS entrypoints detected', {
      paths,
      sectionName
    })
  }

  const assetUrlScript: string = [
    '<script class="json-portable-section-assets" type="application/json">',
    JSON.stringify({ sectionName }),
    '</script>'
  ].join('\n')

  return assetUrlScript
}

export const buildSection = async (sectionName: string): Promise<void> => {
  const processCssModulesTags = makeCssModulesTagProcessor()
  const buildPortableStyles = await makeBuildPortableStyles({ logger })

  const sectionCwd = Path.resolve(workdir, FOLDER, sectionName)
  const sectionFilepath = Path.resolve(sectionCwd, 'section.liquid')

  const rawTemplate = await fs.readFile(sectionFilepath, {
    encoding: 'utf-8'
  })

  const cssModulePaths = await glob('style.module.scss', {
    cwd: sectionCwd,
    absolute: true,
    onlyFiles: true
  })

  if (cssModulePaths.length > 0) {
    throw new DevOpsError(
      `Filename forbidden, please rename "style.module.scss" to "styles.scss"`,
      { sectionName, cssModulePaths }
    )
  }

  const { stylenames, stylesheet, tsModule } = await buildPortableStyles({
    fileLoadPath: sectionCwd,
    filename: 'styles.scss',
    moduleName: sectionName
  })

  const stylesheetSegment: string | null =
    stylesheet.length > 0
      ? ['<style>', stylesheet, '</style>'].join('\n')
      : null

  const relativePath = Path.relative(workdir, sectionFilepath)
  const bannerText = `DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:assets:source={${relativePath}}]`

  const cssModulesTagsResult = processCssModulesTags({
    template: rawTemplate,
    cssModules: stylenames
  })

  if (cssModulesTagsResult.status === 'error') {
    const firstError = cssModulesTagsResult.errors[0]
    logger.error(
      'Failed to process CSS Modules tags in section "{sectionName}": {code} at line {line}',
      {
        code: firstError?.code ?? 'UNKNOWN_ERROR',
        line: firstError?.line,
        sectionName
      }
    )

    throw new DevOpsError('Failed to process CSS Modules tags', {
      sectionName
    })
  }

  if (cssModulesTagsResult.warnings.length > 0) {
    logger.warn(
      [
        '"{sectionName}" - CSS Modules tag warnings:',
        ...cssModulesTagsResult.warnings.map((warning) => {
          return `  - ${warning.code} - "${warning.identifier}" at line ${warning.line}`
        })
      ].join('\n'),
      {
        sectionName
      }
    )
  }

  const template =
    [
      `{% # ${bannerText} %}`,
      await buildAssetReferenceList({ sectionCwd, sectionName }),
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
      Path.resolve(themedir, './sections', `./${sectionName}.liquid`),
      template
    ),
    fs.writeFile(Path.resolve(sectionCwd, 'styles.scss.ts'), tsModule)
  ])

  fsOps.forEach((result) => {
    if (result.status === 'rejected') {
      throw new DevOpsError('File operation failed', {
        sectionName,
        err: result.reason,
        traceTag: '100f5a64462f4687b4d588cba4aa5161'
      })
    }
  })
}
