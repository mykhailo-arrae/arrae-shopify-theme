import browserslist from 'browserslist'
import { browserslistToTargets, type TransformOptions } from 'lightningcss'
import { browserslist as browserslistQueries } from '../../../../package.json'
import { workdir } from '../process/workdir.js'
import { ASSET_FILE_PREFIX } from '../shopify/asset-file-prefix.js'
import { makeCssModulesOptions } from './css-module-options.js'

const targets = browserslistToTargets(browserslist(browserslistQueries))

export type BaseOptions = Omit<
  TransformOptions<Record<string, never>>,
  'code' | 'filename'
>

export type Input =
  | {
      mode: 'css-module'
      cssModuleName: string | null
    }
  | { mode: 'global' }

export const makeBaseLightningCssOptions = (input: Input): BaseOptions => {
  const baseLightningCssOptions = {
    targets,
    cssModules:
      input.mode === 'global'
        ? false
        : makeCssModulesOptions({
            mode: 'custom',
            assetFilePrefix: ASSET_FILE_PREFIX,
            cssModuleName: input.cssModuleName
          }),
    minify: true,
    projectRoot: workdir,
    sourceMap: false
  } satisfies BaseOptions

  return baseLightningCssOptions
}
