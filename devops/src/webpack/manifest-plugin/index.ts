import fs from 'node:fs/promises'
import Path from 'node:path'
import type { RspackPluginFunction } from '@rspack/core'
import { minify } from '@swc/core'
import * as esbuild from 'esbuild'
import { sort } from 'fast-sort'
import { Manifest } from '../../asset-loader/manifest.js'
import { inferEsbuildTargetsFromBrowserslist } from '../../core/bundle/browserslist-to-esbuild.js'
import { DevOpsError } from '../../core/errors/index.js'
import { safeAwait } from '../../core/errors/safe-await.js'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { themedir } from '../../core/process/themedir.js'
import { workdir } from '../../core/process/workdir.js'
import { entries } from '../../core/typescript/entries.js'

export const ManifestPlugin: RspackPluginFunction = (compiler) => {
  const esbuildTargets = inferEsbuildTargetsFromBrowserslist()
  const logger = initLogger().with({ name: 'manifest-plugin' })
  const logErrorDetails = makeLogErrorDetails(logger)

  compiler.hooks.afterEmit.tapPromise(
    'ManifestPluginAfterEmit',
    async (compilation): Promise<void> => {
      try {
        const stats = compilation.getStats().toJson()

        const { entrypoints: _entrypoints } = stats

        if (_entrypoints == null) {
          throw new DevOpsError('Entrypoints not defined', { stats })
        }

        const entrypoints = sort(entries(_entrypoints))
          .asc(([name]) => name)
          .flatMap(([, entrypoint]) => {
            const { assets, name: entrypointName } = entrypoint

            if (assets == null) {
              return []
            }

            if (entrypointName == null) {
              return []
            }

            return [
              {
                info: entrypointName,
                assets: assets.map(({ name }) => {
                  return {
                    name,
                    src: `{{ '${name}' | asset_url | json }}`
                  }
                })
              }
            ]
          })

        const manifest = await Manifest.parseAsync({
          templateDir: `{{ template.directory | default: 'none' | json }}`,
          templateName: `{{ template.name | default: 'unknown' | json }}`,
          entries: entrypoints
        })

        logger.info('Manifest created')

        const { errors, warnings, outputFiles } = await esbuild.build({
          bundle: true,
          entryPoints: [
            Path.resolve(workdir, 'devops/src/asset-loader/index.ts')
          ],
          format: 'iife',
          minify: false,
          sourcemap: false,
          target: esbuildTargets,
          write: false
        })

        if (errors.length) {
          throw new DevOpsError('Asset loader JS block cannot be compiled', {
            errors,
            warnings,
            traceTag: '660740362a464d488b6432451b557b97'
          })
        }

        if (warnings.length) {
          logger.warn('Asset loader JS block compiled with warnings', {
            warnings
          })
        }

        const esbuildOutput = outputFiles.at(0) || null

        if (esbuildOutput == null) {
          throw new DevOpsError('No asset loader output from esbuild', {
            outputFiles,
            errors,
            warnings,
            traceTag: '3d8ca17d2a92426c9236d9059ec94013'
          })
        }

        const { text: __assetLoader } = esbuildOutput

        const [minificationErr, minificationResult] = await safeAwait(
          minify(__assetLoader, {
            compress: {
              defaults: true,
              passes: 3
            },
            mangle: false,
            format: {
              comments: 'some'
            },
            sourceMap: false
          })
        )

        if (minificationErr) {
          logger.debug('Asset loader cannot be minified')
          __assetLoader
            .split('\n')
            .filter((line) => line)
            .forEach((line) => {
              logger.trace(line)
            })
          throw minificationErr
        }

        const { code: assetLoader, warnings: minifierWarnings } =
          await esbuild.transform(minificationResult.code, {
            minifyWhitespace: true,
            loader: 'js',
            lineLimit: 240
          })

        minifierWarnings.forEach(({ text: message, location, notes, id }) => {
          logger.warn(message, { id, location, notes })
        })

        const liquifiedManifest = JSON.stringify(manifest, null, 2)
          .replace(/"{{/gm, '{{')
          .replace(/}}"/gm, '}}')

        const snippetContents = `{% # DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:assets] %}
<script class="json-asset-manifest" type="application/json">
${liquifiedManifest}
</script>

<script>${assetLoader}</script>
`

        logger.trace('Generating asset loader snippet')
        await fs.writeFile(
          Path.resolve(themedir, 'snippets/asset-loader.liquid'),
          snippetContents,
          { encoding: 'utf-8' }
        )

        logger.info('Asset loader generated successfully')
      } catch (_err) {
        const err = logErrorDetails(_err)

        throw err
      }
    }
  )
}
