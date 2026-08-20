import Path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'
import { type DOMWindow, JSDOM, ResourceLoader, VirtualConsole } from 'jsdom'
import { DevOpsError } from '../../errors/index.js'
import { workdir } from '../../process/workdir.js'

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
  log,
  markup,
  url
}: {
  entrypoint: string
  log: (...args: unknown[]) => void
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
      throw new DevOpsError(`JSDOM bundle cannot be created`, {
        err,
        entrypoint,
        url,
        markup
      })
    })

  const scripts = bundle.outputFiles.map((file) => {
    return `<script>${file.text}</script>`
  })

  const virtualConsole = new VirtualConsole({ captureRejections: true })
  virtualConsole.on('jsdomError', (...args: unknown[]) => {
    log('JSDOM error:', ...args)
  })
  virtualConsole.on('error', (...args: unknown[]) => {
    log('Virtual console error:', ...args)
  })

  /**
   * Custom resource loader to ensure all external scripts are stubbed with a fake response.
   */
  class CustomResourceLoader extends ResourceLoader {
    override fetch() {
      type FetchReturnType = NonNullable<ReturnType<ResourceLoader['fetch']>>

      const promise = Promise.resolve(Buffer.from('window.the_answer = 42;'))

      // @ts-expect-error jsdom expects an abort method
      promise.abort = () => {
        /* NOOP */
      }

      // JSDOM uses AbortablePromise type that's not available outside of the library
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return promise as FetchReturnType
    }
  }

  const { window: _window } = new JSDOM(
    `
    <!DOCTYPE html>
    <body>
    ${markup}
    ${scripts.join('\n')}
    </body>
  `,
    {
      url,
      virtualConsole,
      resources: new CustomResourceLoader(),
      beforeParse: (window) => {
        window.addEventListener('error', (event) => {
          log(event.error)
        })
      },
      runScripts: 'dangerously'
    }
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
