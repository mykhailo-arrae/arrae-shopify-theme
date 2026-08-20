import test from 'ava'
import { sleep } from '../core/process/sleep.js'
import { loadBundleIntoJsdom } from '../core/test/load-bundle-into-jsdom/index.js'
import type * as Bundle from './index.js'
import type { Manifest } from './manifest.js'

test('given portable blocks', async (t) => {
  const manifest: Manifest = {
    templateDir: 'none',
    templateName: 'product',
    entries: [
      {
        info: { type: 'block', name: 'content-card' },
        assets: [
          { name: 'shared-runtime.js', src: '/shared-runtime.js' },
          { name: 'block-content-card.js', src: '/block-content-card.js' }
        ]
      },
      {
        info: { type: 'block', name: 'hero-banner' },
        assets: [
          { name: 'shared-runtime.js', src: '/shared-runtime.js' },
          { name: 'block-hero-banner.js', src: '/block-hero-banner.js' }
        ]
      },
      {
        info: { type: 'section', name: 'featured' },
        assets: [
          { name: 'shared-runtime.js', src: '/shared-runtime.js' },
          { name: 'section-featured.js', src: '/section-featured.js' }
        ]
      }
    ]
  }

  const sectionIds = {
    featured: 'shopify-section-template--15029298888807__featured_cPMpQr',
    remote: 'shopify-section-template--15029298888807__remote_pC4dWj'
  } as const

  const markup = `
    <script class="json-asset-manifest" type="application/json">
      ${JSON.stringify(manifest)}
    </script>
    <div id="${sectionIds.featured}" class="shopify-section">
      <script class="json-portable-section-assets" type="application/json">
      {"sectionName":"featured"}
      </script>
      <script class="json-portable-block-assets" type="application/json">
      {"blockName":"content-card"}
      </script>
    </div>
  `

  const remoteMarkup = `
    <div id="${sectionIds.remote}" class="shopify-section">
      <script class="json-portable-block-assets" type="application/json">
      {"blockName":"hero-banner"}
      </script>
    </div>
  `

  const url = 'http://localhost:3000'

  const { closeBrowserContext, window } = await loadBundleIntoJsdom<
    typeof Bundle
  >({
    markup,
    url,
    log: (...args) => {
      t.log(...args)
    },
    entrypoint: './devops/src/asset-loader/index.js'
  })

  t.teardown(closeBrowserContext)

  const { document, CustomEvent, HTMLScriptElement, DOMParser } = window

  const getLoadedScripts = (): string[] => {
    return [...document.querySelectorAll('script')].flatMap((el) => {
      return el instanceof HTMLScriptElement && el.src ? [el.src] : []
    })
  }

  const mapExpected = (items: string[]): string[] => {
    return items.map((src) => new URL(src, url).href)
  }

  t.deepEqual(
    getLoadedScripts(),
    mapExpected([
      '/shared-runtime.js',
      '/section-featured.js',
      '/block-content-card.js'
    ]),
    'should load assets for blocks present in initial DOM'
  )

  const remoteSection = new DOMParser().parseFromString(
    remoteMarkup,
    'text/html'
  ).body.firstElementChild

  if (remoteSection == null) {
    throw new Error('Remote section cannot be parsed')
  }

  document.body.appendChild(remoteSection)

  const evt = new CustomEvent('shopify:section:load', { bubbles: true })
  remoteSection.dispatchEvent(evt)

  await sleep()

  t.deepEqual(
    getLoadedScripts(),
    mapExpected([
      '/shared-runtime.js',
      '/section-featured.js',
      '/block-content-card.js',
      '/block-hero-banner.js'
    ]),
    'should load block assets on shopify:section:load for dynamically added sections'
  )
})

test('malformed block payload must not prevent sibling block initialization', async (t) => {
  const manifest: Manifest = {
    templateDir: 'none',
    templateName: 'product',
    entries: [
      {
        info: { type: 'block', name: 'valid-block' },
        assets: [
          { name: 'shared-runtime.js', src: '/shared-runtime.js' },
          { name: 'block-valid-block.js', src: '/block-valid-block.js' }
        ]
      }
    ]
  }

  const sectionId = 'shopify-section-template--15029298888807__malformed_test'

  const markup = `
    <script class="json-asset-manifest" type="application/json">
      ${JSON.stringify(manifest)}
    </script>
    <div id="${sectionId}" class="shopify-section">
      <script class="json-portable-block-assets" type="application/json">
      NOT VALID JSON
      </script>
      <script class="json-portable-block-assets" type="application/json">
      {"blockName":"valid-block"}
      </script>
    </div>
  `

  const url = 'http://localhost:3000'

  const { closeBrowserContext, window } = await loadBundleIntoJsdom<
    typeof Bundle
  >({
    markup,
    url,
    log: (...args) => {
      t.log(...args)
    },
    entrypoint: './devops/src/asset-loader/index.js'
  })

  t.teardown(closeBrowserContext)

  const { document, HTMLScriptElement } = window

  const getLoadedScripts = (): string[] => {
    return [...document.querySelectorAll('script')].flatMap((el) => {
      return el instanceof HTMLScriptElement && el.src ? [el.src] : []
    })
  }

  const mapExpected = (items: string[]): string[] => {
    return items.map((src) => new URL(src, url).href)
  }

  t.deepEqual(
    getLoadedScripts(),
    mapExpected(['/shared-runtime.js', '/block-valid-block.js']),
    'valid block should still load despite malformed sibling payload'
  )
})
