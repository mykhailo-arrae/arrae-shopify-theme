import Path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'
import { type DOMWindow, JSDOM } from 'jsdom'
import { AppError } from '../../errors/app-error.js'
import { workdir } from '../workdir.js'

const globalName = 'bundle'

type BundleDOMWindow<T> = {
  [globalName]: T
} & DOMWindow

export type Context<B> = {
  [globalName]: B
  window: BundleDOMWindow<B>
  closeBrowserContext: () => void
}

/**
 * We load the module as a DOM script to ensure it has access to the right globals, e.g., window.location
 * https://github.com/jsdom/jsdom/wiki/Don't-stuff-jsdom-globals-onto-the-Node-global
 *
 * @param entrypoint - path to a **Typescript file** relative to project root
 */
export const loadBundleIntoJsdom = async <B>({
  entrypoint: _entrypoint,
  markup,
  url
}: {
  entrypoint: string
  markup: string
  url?: string
}): Promise<Context<B>> => {
  const entrypoint = _entrypoint.startsWith('file://')
    ? fileURLToPath(_entrypoint)
    : Path.resolve(workdir, _entrypoint)

  const bundle = await esbuild
    .build({
      globalName,
      entryPoints: [entrypoint],
      bundle: true,
      absWorkingDir: workdir,
      format: 'iife',
      platform: 'browser',
      sourcemap: 'inline',
      write: false
    })
    .catch((err: unknown) => {
      throw new AppError(`JSDOM bundle cannot be created`, {
        err,
        entrypoint,
        url,
        markup
      })
    })

  const scripts = bundle.outputFiles.map((file) => {
    return `<script>${file.text}</script>`
  })

  const { window: _window } = new JSDOM(
    `
    <body>
		${markup}
    ${scripts.join('\n')}
    </body>
  `,
    { url, runScripts: 'dangerously' }
  )

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const window = _window as BundleDOMWindow<B>

  return {
    window,
    [globalName]: window.bundle,
    closeBrowserContext: () => {
      window.close()
    }
  }
}
