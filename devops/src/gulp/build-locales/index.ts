import Path from 'node:path'
import { minify } from '@swc/core'
import cldr from 'cldr'
import * as esbuild from 'esbuild'
import flatPaths from 'flat'
import { glob } from 'glob'
import gulp from 'gulp'
import rename from 'gulp-rename'
import vinylmap from 'vinyl-map2'
import { DevOpsError } from '../../core/errors/index.js'
import { safeAwait } from '../../core/errors/safe-await.js'
import type { Task } from '../../core/fs/watcher/with-file-changes.js'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { pipeline } from '../../core/node/promisified-pipeline.js'
import { themedir } from '../../core/process/themedir.js'
import { isPlainObject } from '../../core/typescript/is-plain-object.js'

const I18N_POINTER = 'themeLocales'

const defaultLocale = Path.resolve(themedir, 'locales/en.default.json')
const destination = Path.resolve(themedir, 'snippets')

const NAME = 'build-locales'

const logger = initLogger().with({ name: NAME })
const logErrorDetails = makeLogErrorDetails(logger)

export const buildLocales: Task = {
  name: NAME,
  exec: async (): Promise<void> => {
    const unquoteTemplateTags = (text = '') =>
      text
        .split('\n')
        .map((line) => line.replace('"{{', '{{').replace('}}"', '}}'))
        .filter((line) => line)
        .join('\n')

    const createLocaleTemplate = (rawLocale: string | Buffer = ''): string => {
      const flattened = flatPaths(
        JSON.parse(
          Buffer.isBuffer(rawLocale) ? rawLocale.toString() : rawLocale
        )
      )

      if (isPlainObject(flattened)) {
        const entries = Object.entries(flattened).map(([key]) => [
          key,
          `{{ '${key}' | t | json }}`
        ])

        return JSON.stringify(Object.fromEntries(entries), null, 2)
      }

      throw new DevOpsError('Flattened result is not an object')
    }

    const printLocale = (localeName: string | null): string => {
      if (localeName == null) {
        return '{}'
      }

      const _getPluralRule: unknown = cldr.extractPluralRuleFunction(
        localeName.replace('-', '_'),
        'cardinal'
      )

      if (typeof _getPluralRule !== 'function') {
        return '{}'
      }

      const getPluralRule = _getPluralRule.toString()

      const name = JSON.stringify(localeName)

      return `{
      name: ${name},
      getPluralRule: ${getPluralRule}
    }`
    }

    const printLocaleKeyValue = (key: string, value: string) =>
      `${JSON.stringify(key)}: ${value}`

    const buildPaths = vinylmap((contents, _, done) => {
      const run = async (): Promise<string> => {
        const localeNames = new Set<string>()
        let defaultLocaleName = null

        const localePaths = await glob('**/*.json', {
          cwd: Path.dirname(defaultLocale),
          nodir: true,
          signal: AbortSignal.timeout(10_000)
        })

        localePaths.forEach((localePath) => {
          const filename = Path.basename(localePath)
          const localeName = filename.split('.').at(0)?.toLowerCase()

          if (!localeName) {
            return
          }

          if (filename.endsWith('.default.json')) {
            defaultLocaleName = localeName
          }

          if (filename.endsWith('.json')) {
            localeNames.add(localeName)
          }
        })

        const availableLocales = [...localeNames]
          .sort()
          .flatMap((localeName: string): string[] => {
            if (localeName === 'zh-tw') {
              return []
            }

            return [printLocaleKeyValue(localeName, printLocale(localeName))]
          })

        const minifiableScriptContents = [
          'locale._availableLocales = {',
          [
            printLocaleKeyValue('_default', printLocale(defaultLocaleName)),
            ...availableLocales
          ].join(',\n'),
          '};'
        ].join('\n')

        const [minificationErr, _minifiedScriptContents] = await safeAwait(
          minify(minifiableScriptContents, {
            compress: {
              defaults: true,
              dead_code: true,
              keep_classnames: true,
              keep_fnames: false,
              passes: 3
            },
            mangle: false,
            format: { wrapIife: false }
          })
        )

        if (minificationErr) {
          logger.debug('Script contents cannot be minified')
          minifiableScriptContents
            .split('\n')
            .filter((line) => line)
            .forEach((line) => {
              logger.trace(line)
            })
          throw minificationErr
        }

        const { code: minifiedScriptContents, warnings: minifierWarnings } =
          await esbuild.transform(_minifiedScriptContents.code, {
            minifyWhitespace: true,
            loader: 'js',
            format: 'esm',
            lineLimit: 120
          })

        minifierWarnings.forEach(({ text: message, location, notes, id }) => {
          logger.warn('{message}', { id, location, notes, message })
        })

        const scriptContents = [
          '/*! DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:codegen:source={devops/src/gulp/build-locales/index.ts}] */',
          '(function() {',
          '"use strict";',
          ['var locale = ', createLocaleTemplate(contents), ';'].join(''),
          minifiedScriptContents,
          'locale._currentLocale = locale._availableLocales[{{ shop_locale.iso_code | json }}] || locale._availableLocales["_default"];',
          `window[${JSON.stringify(I18N_POINTER)}] = locale;`,
          '})();'
        ].join('\n')

        const wrapped = [
          '<script type="text/javascript">',
          unquoteTemplateTags(scriptContents),
          '</script>'
        ].join('\n')

        return wrapped
      }

      run()
        .then((wrapped) => {
          done(null, wrapped)
        })
        .catch((err: unknown) => {
          done(err instanceof Error ? err : new Error('Unknown error'))
        })
    })

    try {
      await pipeline([
        gulp.src(defaultLocale),
        buildPaths,
        rename('js-locales.liquid'),
        gulp.dest(destination)
      ])

      logger.info('Compiled locale helper utility')
    } catch (_err) {
      const err = logErrorDetails(_err)
      throw err
    }
  }
}

export const buildAllLocales = async (): Promise<void> => {
  await buildLocales.exec()
}
