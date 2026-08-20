import type { Asset, Manifest } from './manifest.js'
import { parseSectionData } from './parse-section-data.js'
import { parseSectionFromEvent } from './parse-section-from-event.js'

/**
 * The asset loader should not rely on external loggers
 */
const DEBUG = false

const debug = DEBUG
  ? (...args: unknown[]): void => {
      // eslint-disable-next-line no-console
      console.debug('Asset loader: ', ...args)
    }
  : () => {
      /* NOOP */
    }

const warn = DEBUG
  ? (...args: unknown[]): void => {
      console.warn('Asset loader: ', ...args)
    }
  : () => {
      /* NOOP */
    }

const onDocumentReady = (fn: () => void): void => {
  if (
    document.readyState === 'complete' ||
    document.readyState === 'interactive'
  ) {
    // call on next available tick
    setTimeout(fn, 1)
    return
  }

  document.addEventListener('DOMContentLoaded', fn)
}

const init = () => {
  const SNIPPET_SELECTOR = '.portable-snippet[data-snippet-name]'

  const InitializedAssets = new Set<string>()

  const initJsAsset = ({ name, src }: Asset): void => {
    if (InitializedAssets.has(src)) {
      return
    }

    /**
     * Apply project-specific defer exceptions as boolean expressions.
     *
     * Important! For 99% of projects, it's safe to defer all chunks.
     *
     * It's a sign of deeper problems in a project if your problem is solved by turning off defer.
     */
    const defer: boolean = name.length > 0 ? true : false

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = src
    script.defer = defer

    onDocumentReady(() => {
      document.body.appendChild(script)
    })

    InitializedAssets.add(src)
  }

  const initCssAsset = ({ src }: Asset): void => {
    if (InitializedAssets.has(src)) {
      return
    }

    const link = document.createElement('link')
    link.type = 'text/css'
    link.rel = 'stylesheet'
    link.href = src

    onDocumentReady(() => {
      document.head.appendChild(link)
    })

    InitializedAssets.add(src)
  }

  const initAsset = (asset: Asset): void => {
    if (asset.name.endsWith('.css')) {
      initCssAsset(asset)
      return
    }

    initJsAsset(asset)
  }

  const _manifestEl = document.querySelector('script.json-asset-manifest')
  const manifestEl =
    _manifestEl instanceof HTMLScriptElement ? _manifestEl : null

  if (manifestEl == null) {
    throw new Error('Asset manifest not found')
  }

  const _manifest = manifestEl.textContent

  if (_manifest == null) {
    throw new Error('Asset manifest content is empty')
  }

  // The asset loader script should be as small as possible. We verify the manifest shape at compile time
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const manifest = JSON.parse(_manifest) as Manifest

  // 1. INIT THEME & TEMPLATE BUNDLES
  manifest.entries.forEach((entry) => {
    if (entry.info.type === 'block') {
      return
    }

    if (entry.info.type === 'section') {
      return
    }

    if (entry.info.type === 'snippet') {
      return
    }

    if (entry.info.type === 'wc') {
      return
    }

    if (entry.info.type === 'theme') {
      entry.assets.forEach(initAsset)
      return
    }

    if (entry.info.type === 'customer') {
      if (manifest.templateDir === 'customers') {
        entry.assets.forEach(initAsset)
        return
      }
      return
    }

    if (entry.info.type === 'home') {
      if (manifest.templateName === 'index') {
        entry.assets.forEach(initAsset)
        return
      }
      return
    }

    if (entry.info.type === 'collection') {
      if (manifest.templateName === entry.info.type) {
        entry.assets.forEach(initAsset)
        return
      }
      return
    }

    if (entry.info.type === 'product') {
      if (manifest.templateName === 'product') {
        entry.assets.forEach(initAsset)
        return
      }
      return
    }

    void (entry.info.type satisfies never)
  })

  // 2. INIT SECTION BUNDLES
  const initSectionAssets = (section: Element): void => {
    try {
      debug('Initializing section assets', { section })

      const _scriptElement = section.querySelector(
        'script.json-portable-section-assets'
      )
      const scriptElement =
        _scriptElement instanceof HTMLScriptElement ? _scriptElement : null

      if (scriptElement == null) {
        warn('Section manifest JSON element not found', { section })
        return
      }

      const { sectionName } = parseSectionData(
        JSON.parse(scriptElement.textContent ?? '{}')
      )

      const manifestEntry = manifest.entries.find((item) => {
        return item.info.type === 'section' && item.info.name === sectionName
      })

      if (manifestEntry == null) {
        return
      }

      manifestEntry.assets.forEach(initAsset)
    } catch (err) {
      console.error('Section assets cannot be initialized', err, section)
    }
  }

  document.addEventListener(
    'shopify:section:load',
    (evt): void => {
      const section = parseSectionFromEvent(evt)

      if (section == null) {
        return
      }

      initSectionAssets(section)
    },
    { passive: true }
  )

  const sections = document.querySelectorAll('.shopify-section')

  sections.forEach(initSectionAssets)

  // 3. INIT BLOCK BUNDLES
  const BLOCK_SCRIPT_SELECTOR = 'script.json-portable-block-assets'

  const initBlockAssets = (container: Element): void => {
    const scriptElements = container.querySelectorAll(BLOCK_SCRIPT_SELECTOR)

    scriptElements.forEach((_scriptEl) => {
      try {
        const scriptEl =
          _scriptEl instanceof HTMLScriptElement ? _scriptEl : null

        if (scriptEl == null) {
          return
        }

        const data: unknown = JSON.parse(scriptEl.textContent ?? '{}')

        if (
          data == null ||
          typeof data !== 'object' ||
          !('blockName' in data) ||
          typeof data.blockName !== 'string'
        ) {
          return
        }

        const { blockName } = data

        const manifestEntry = manifest.entries.find((item) => {
          return item.info.type === 'block' && item.info.name === blockName
        })

        if (manifestEntry == null) {
          return
        }

        manifestEntry.assets.forEach(initAsset)
      } catch (err) {
        console.error('Block assets cannot be initialized', err, _scriptEl)
      }
    })
  }

  document.addEventListener(
    'shopify:section:load',
    (evt): void => {
      const section = parseSectionFromEvent(evt)

      if (section == null) {
        return
      }

      initBlockAssets(section)
    },
    { passive: true }
  )

  document.querySelectorAll('.shopify-section').forEach(initBlockAssets)

  // 4. INIT SNIPPET BUNDLES
  const initSnippetAssets = (snippet: Element | EventTarget | null): void => {
    try {
      if (snippet == null) {
        return
      }

      if (snippet instanceof HTMLElement === false) {
        return
      }

      if (snippet.matches(SNIPPET_SELECTOR) === false) {
        debug('Snippet does not match primary selector', {
          snippet,
          selector: SNIPPET_SELECTOR
        })
        return
      }

      const snippetName = snippet.getAttribute('data-snippet-name')

      if (!snippetName) {
        console.warn('data-snippet-name attribute is required', { snippet })
        return
      }

      const manifestEntry = manifest.entries.find((item) => {
        return item.info.type === 'snippet' && item.info.name === snippetName
      })

      if (manifestEntry == null) {
        return
      }

      manifestEntry.assets.forEach(initAsset)
    } catch (err) {
      console.error('Snippet assets cannot be initialized', snippet, err)
    }
  }

  document.addEventListener(
    'shopify:section:load',
    (evt): void => {
      const section = parseSectionFromEvent(evt)

      if (section == null) {
        warn('Event target is not a section', evt.target)
        return
      }

      section.querySelectorAll(SNIPPET_SELECTOR).forEach(initSnippetAssets)
    },
    {
      passive: true
    }
  )

  document.addEventListener(
    'portable:snippet:load',
    (evt): void => {
      initSnippetAssets(evt.target)
    },
    {
      passive: true
    }
  )

  document.querySelectorAll(SNIPPET_SELECTOR).forEach(initSnippetAssets)

  // 5. INIT WEB COMPONENT BUNDLES
  const initWebComponentBundles = (): void => {
    manifest.entries.forEach((item) => {
      try {
        if (item.info.type !== 'wc') {
          return
        }

        const element = document.querySelector(item.info.name)

        if (element == null) {
          return
        }

        item.assets.forEach(initAsset)
      } catch (err: unknown) {
        console.error('Web component assets cannot be initialized', err, item)
      }
    })
  }

  document.addEventListener('shopify:section:load', initWebComponentBundles, {
    passive: true
  })

  document.addEventListener('portable:snippet:load', initWebComponentBundles, {
    passive: true
  })

  document.addEventListener(
    'portable:web-component:load',
    initWebComponentBundles,
    {
      passive: true
    }
  )

  initWebComponentBundles()
}

init()
