import Path from 'node:path'
import type { LoaderDefinition } from '@rspack/core'
import { sort } from 'fast-sort'
import { type CSSModuleExports, transform } from 'lightningcss'
import { compileStringAsync } from 'sass-embedded'
import { DevOpsError } from '../../core/errors/index.js'
import { workdir } from '../../core/process/workdir.js'
import { kebabCase } from '../../core/string/kebab-case.js'
import { makeBaseLightningCssOptions } from '../../core/styles/lightningcss-settings.js'
import {
  makeSassLogger,
  type RspackLogger
} from '../../core/styles/sass-logger.js'
import { LOAD_PATHS } from '../../core/styles/sass-settings.js'
import { cssLoaderApiImport } from './css-loader-export-init.js'

const mapCssExportsToStylenames = (
  cssExports: CSSModuleExports | null
): Record<string, string> => {
  return cssExports == null
    ? {}
    : sort(Object.entries(cssExports))
        .asc(([name]) => name)
        .reduce<Record<string, string>>(
          (acc, [name, { name: generatedName }]) => {
            acc[name] = generatedName
            return acc
          },
          {}
        )
}

const generate = async ({
  content,
  filepath,
  logger,
  addDependency
}: {
  content: string
  filepath: string
  logger: RspackLogger
  addDependency: (dependency: string) => void
}): Promise<string> => {
  const filename = Path.resolve(workdir, filepath)

  const cssModuleName = kebabCase(
    Path.dirname(Path.relative(Path.resolve(workdir, '_js-dist'), filename))
  ).replaceAll('-', '_')

  const baseOptions = makeBaseLightningCssOptions({
    cssModuleName,
    mode: 'css-module'
  })

  const { css, loadedUrls } = await compileStringAsync(content, {
    loadPaths: [...LOAD_PATHS, Path.dirname(filename)],
    style: 'expanded',
    logger: makeSassLogger({ logger: { type: 'rspack', logger }, silent: true })
  })

  loadedUrls.forEach((url) => {
    addDependency(url.pathname)
  })

  const { code, warnings, dependencies, exports } = transform({
    ...baseOptions,
    code: Buffer.from(css),
    filename
  })

  if (dependencies != null && dependencies.length > 0) {
    throw new Error(
      'SCSS Module Loader does not support `composes from` syntax'
    )
  }

  if (warnings.length) {
    warnings.forEach(({ loc, message, type }) => {
      logger.warn({ loc, filename, type }, message)
    })
  }

  const stylesheet = code.toString().split('}').join('}\n').trim()
  const locals = mapCssExportsToStylenames(exports || null)

  return [
    `var ___CSS_LOADER_API_IMPORT___ = ${cssLoaderApiImport};`,
    `var ___CSS_LOADER_EXPORT___ = ___CSS_LOADER_API_IMPORT___();`,
    `___CSS_LOADER_EXPORT___.push([module.id, ${JSON.stringify(stylesheet)}]);`,
    `___CSS_LOADER_EXPORT___.locals = ${JSON.stringify(locals)};`,
    `export default ___CSS_LOADER_EXPORT___;`
  ].join('\n')
}

const ScssModuleLoader: LoaderDefinition = function (content): void {
  const logger = this.getLogger('scss-module-loader')
  const cb = this.async()
  const addDependency = (file: string) => {
    this.addDependency(file)
  }

  const filepath = this.resourcePath

  generate({
    addDependency,
    content,
    logger,
    filepath
  })
    .then((result) => {
      cb(null, result)
    })
    .catch((err): void => {
      cb(
        err instanceof Error
          ? err
          : typeof err === 'string'
            ? new DevOpsError(err, { filepath })
            : new DevOpsError('Unknown scss module loader error')
      )
    })
}

export default ScssModuleLoader
