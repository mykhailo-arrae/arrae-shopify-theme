import Path from 'node:path'
import type { LoaderDefinition } from '@rspack/core'
import { transform } from 'lightningcss'
import { compileStringAsync } from 'sass-embedded'
import { DevOpsError } from '../../core/errors/index.js'
import { workdir } from '../../core/process/workdir.js'
import { makeBaseLightningCssOptions } from '../../core/styles/lightningcss-settings.js'
import {
  makeSassLogger,
  type RspackLogger
} from '../../core/styles/sass-logger.js'
import { LOAD_PATHS } from '../../core/styles/sass-settings.js'

const baseOptions = makeBaseLightningCssOptions({
  mode: 'global'
})

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

  const { css, loadedUrls } = await compileStringAsync(content, {
    loadPaths: [...LOAD_PATHS],
    style: 'expanded',
    logger: makeSassLogger({ logger: { type: 'rspack', logger }, silent: true })
  })

  loadedUrls.forEach((url) => {
    addDependency(url.pathname)
  })

  const { code, warnings } = transform({
    ...baseOptions,
    code: Buffer.from(css),
    filename
  })

  if (warnings.length) {
    warnings.forEach(({ loc, message, type }) => {
      logger.warn({ loc, filename, type }, message)
    })
  }

  const stylesheet = code.toString().split('}').join('}\n').trim()

  return `
export const shadowStyles = ${JSON.stringify(stylesheet)};
  `
}

const ShadowStyleLoader: LoaderDefinition = function (content): void {
  const logger = this.getLogger('shadow-style-loader')
  const cb = this.async()
  const addDependency = (file: string) => {
    this.addDependency(file)
  }

  generate({
    addDependency,
    content,
    logger,
    filepath: this.resourcePath
  })
    .then((result) => {
      cb(null, result)
    })
    .catch((err): void => {
      cb(
        err instanceof Error
          ? err
          : typeof err === 'string'
            ? new DevOpsError(err)
            : new DevOpsError('Unknown shadow style loader error')
      )
    })
}

export default ShadowStyleLoader
