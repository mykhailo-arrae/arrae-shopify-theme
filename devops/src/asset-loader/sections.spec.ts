import test from 'ava'
import { sleep } from '../core/process/sleep.js'
import { loadBundleIntoJsdom } from '../core/test/load-bundle-into-jsdom/index.js'
import type * as Bundle from './index.js'
import type { Manifest } from './manifest.js'

test('given portable sections', async (t) => {
  const manifest: Manifest = {
    templateDir: 'none',
    templateName: 'product',
    entries: [
      {
        info: { type: 'section', name: 'featured-content' },
        assets: [
          { name: 'shared-runtime.js', src: '/shared-runtime.js' },
          {
            name: 'section-featured-content.js',
            src: '/section-featured-content.js'
          }
        ]
      },
      {
        info: { type: 'section', name: 'styleguide' },
        assets: [
          { name: 'shared-runtime.js', src: '/shared-runtime.js' },
          { name: 'section-styleguide.js', src: '/section-styleguide.js' }
        ]
      },
      {
        info: { type: 'snippet', name: 'product-card' },
        assets: [
          { name: 'shared-runtime.js', src: '/shared-runtime.js' },
          { name: 'snippet-product-card.js', src: '/snippet-product-card.js' }
        ]
      },
      {
        info: { type: 'snippet', name: 'product-card-details' },
        assets: [
          { name: 'shared-runtime.js', src: '/shared-runtime.js' },
          {
            name: 'snippet-product-card-details.js',
            src: '/snippet-product-card-details.js'
          }
        ]
      },
      {
        info: { type: 'snippet', name: 'heading-styleguide' },
        assets: [
          { name: 'shared-runtime.js', src: '/shared-runtime.js' },
          {
            name: 'snippet-heading-styleguide.js',
            src: '/snippet-heading-styleguide.js'
          }
        ]
      }
    ]
  }

  const sectionIds = {
    featuredContent:
      'shopify-section-template--15029298888807__featured_content_cPMpQr',
    styleguide: 'shopify-section-template--15029298888807__styleguide_pC4dWj'
  } as const

  const markup = `
    <script class="json-asset-manifest" type="application/json">
      ${JSON.stringify(manifest)}
    </script>
    <div id="${sectionIds.featuredContent}" class="shopify-section">
      <div id="snippet-a" class="portable-snippet" data-snippet-name="product-card">
        <div id="snippet-b" class="portable-snippet" data-snippet-name="product-card-details"></div>
      </div>
      <script class="json-portable-section-assets" type="application/json">
      {"sectionName":"featured-content"}
      </script>
    </div>
  `

  const remoteMarkup = `
    <div id="${sectionIds.styleguide}" class="shopify-section">
      <script class="json-portable-section-assets" type="application/json">
      {"sectionName":"styleguide"}
      </script>
      <div id="snippet-c" class="portable-snippet" data-snippet-name="heading-styleguide">
        <h1>H1 Heading</h1>
      </div>
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

  const actual = [...document.querySelectorAll('script')].flatMap((el) => {
    return el instanceof HTMLScriptElement && el.src ? [el.src] : []
  })

  const expected = [
    '/shared-runtime.js',
    '/section-featured-content.js',
    '/snippet-product-card.js',
    '/snippet-product-card-details.js',
    '/section-styleguide.js',
    '/snippet-heading-styleguide.js'
  ].map((src) => new URL(src, url).href)

  t.deepEqual(actual, expected)
})
