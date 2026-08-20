import Path from 'node:path'
import { sort } from 'fast-sort'
import { type CSSModuleExports, transform } from 'lightningcss'
import { DevOpsError } from '../../../../core/errors/index.js'
import { safeAwait } from '../../../../core/errors/safe-await.js'
import type { Logger } from '../../../../core/logger/index.js'
import { workdir } from '../../../../core/process/workdir.js'
import { makeBaseLightningCssOptions } from '../../../../core/styles/lightningcss-settings.js'

export type StyleExports = Record<string, string>

const generateTypescriptModule = ({
  cssExports
}: {
  cssExports: CSSModuleExports | null
}): { tsModule: string; stylenames: StyleExports } => {
  const stylenames =
    cssExports == null
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

  const _module = `
/* DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:codegen] */
export const style = ${JSON.stringify(stylenames, null, 2)} as const
export type ClassNames = keyof typeof style
export default style
  `

  const tsModule = [_module.trim(), '\n'].join('')

  return { tsModule, stylenames }
}

export type Params = { code: Buffer | string; moduleName: string; path: string }
export type Result = {
  stylesheet: string
  stylenames: StyleExports
  tsModule: string
}

/**
 * Add this pragma to the `styles.scss` file to disable CSS Modules transformation
 */
const GLOBAL_PRAGMA = '@cssModules global'

export const makeBuildCssModule = (logger: Logger) => {
  return async ({ code: _code, moduleName, path }: Params): Promise<Result> => {
    const code = typeof _code === 'string' ? Buffer.from(_code) : _code

    const mode: 'css-module' | 'global' = code.includes(GLOBAL_PRAGMA)
      ? 'global'
      : 'css-module'

    const baseOptions = makeBaseLightningCssOptions({
      mode,
      cssModuleName: moduleName
    })

    const [cssModuleErr, cssModuleResult] = await safeAwait(
      Promise.resolve().then(() => {
        return transform({
          ...baseOptions,
          code,
          filename: Path.resolve(workdir, path)
        })
      })
    )

    if (cssModuleErr) {
      logger.error('Failed to build CSS Module', {
        err: cssModuleErr,
        moduleName,
        path
      })

      throw new DevOpsError('Failed to build CSS Module')
    }

    const { code: _stylesheet, exports, warnings } = cssModuleResult

    if (warnings.length) {
      warnings.forEach(({ loc, message, type }) => {
        logger.error('{message}', { loc, message, moduleName, type })
      })
    }

    const { stylenames, tsModule } = generateTypescriptModule({
      cssExports: exports || null
    })

    const stylesheet = _stylesheet.toString().split('}').join('}\n').trim()

    return { stylenames, stylesheet, tsModule }
  }
}
