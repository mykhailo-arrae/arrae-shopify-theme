import test from 'ava'
import { sleep } from '../core/process/sleep.js'
import { loadBundleIntoJsdom } from '../core/test/load-bundle-into-jsdom/index.js'
import type * as Bundle from './index.js'
import type { Manifest } from './manifest.js'

test('given portable web components', async (t) => {
  const manifest: Manifest = {
    templateDir: 'none',
    templateName: 'product',
    entries: [
      {
        info: { type: 'wc', name: 'product-card' },
        assets: [
          { name: 'runtime.js', src: '/runtime.js' },
          { name: 'product-card.js', src: '/product-card.js' }
        ]
      },
      {
        info: { type: 'wc', name: 'product-card-alt' },
        assets: [
          { name: 'runtime.js', src: '/runtime.js' },
          { name: 'product-card-alt.js', src: '/product-card-alt.js' }
        ]
      },
      {
        info: { type: 'wc', name: 'article-card' },
        assets: [
          { name: 'article-card.css', src: '/article-card.css' },
          { name: 'runtime.js', src: '/runtime.js' },
          { name: 'article-card.js', src: '/article-card.js' }
        ]
      },
      {
        info: { type: 'wc', name: 'article-card-alt' },
        assets: [
          { name: 'article-card-alt.css', src: '/article-card-alt.css' },
          { name: 'runtime.js', src: '/runtime.js' },
          { name: 'article-card-alt.js', src: '/article-card-alt.js' }
        ]
      },
      {
        info: { type: 'wc', name: 'my-button' },
        assets: [
          { name: 'my-button.css', src: '/my-button.css' },
          { name: 'runtime.js', src: '/runtime.js' },
          { name: 'my-button.js', src: '/my-button.js' }
        ]
      }
    ]
  }

  const markup = `
    <script class="json-asset-manifest" type="application/json">
      ${JSON.stringify(manifest)}
    </script>
    <div id="section-a" class="shopify-section">
      <product-card id="wc-a"></product-card>
    </div>
    <div id="snippet-a">
      <article-card id="wc-b"></article-card>
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

  const { document, CustomEvent, HTMLScriptElement, HTMLLinkElement } = window

  const sectionA = document.getElementById('section-a')
  const snippetA = document.getElementById('snippet-a')

  if (sectionA == null || snippetA == null) {
    throw new Error('Section or snippet elements not found')
  }

  const getListOfAssets = (): string[] => {
    return [
      ...document.querySelectorAll('script[src],link[rel="stylesheet"]')
    ].flatMap((el) => {
      return el instanceof HTMLScriptElement && el.src
        ? [el.src]
        : el instanceof HTMLLinkElement && el.href
          ? [el.href]
          : []
    })
  }

  const mapExpected = (items: string[]): string[] => {
    return items.map((src) => new URL(src, url).href)
  }

  // We attach this web component to the DOM after the manifest is loaded
  // It should not appear in the list of assets yet
  const productCardAlt = document.createElement('product-card-alt')
  document.body.appendChild(productCardAlt)

  t.deepEqual(
    getListOfAssets(),
    mapExpected([
      '/article-card.css',
      '/runtime.js',
      '/product-card.js',
      '/article-card.js'
    ]),
    'should load assets for existing web components in the DOM'
  )

  const sectionEvt = new CustomEvent('shopify:section:load', { bubbles: true })
  sectionA.dispatchEvent(sectionEvt)

  await sleep()

  t.deepEqual(
    getListOfAssets(),
    mapExpected([
      '/article-card.css',
      '/runtime.js',
      '/product-card.js',
      '/article-card.js',
      '/product-card-alt.js'
    ]),
    'should react to "shopify:section:load" event'
  )

  const myButton = document.createElement('my-button')
  document.body.appendChild(myButton)

  const snippetEvt = new CustomEvent('portable:snippet:load', {
    bubbles: true
  })
  snippetA.dispatchEvent(snippetEvt)

  await sleep()

  t.deepEqual(
    getListOfAssets(),
    mapExpected([
      '/article-card.css',
      '/my-button.css',
      '/runtime.js',
      '/product-card.js',
      '/article-card.js',
      '/product-card-alt.js',
      '/my-button.js'
    ]),
    'should react to "portable:snippet:load" event'
  )

  const articleCardAlt = document.createElement('article-card-alt')
  document.body.appendChild(articleCardAlt)

  const wcEvt = new CustomEvent('portable:web-component:load', {
    bubbles: true
  })
  document.body.dispatchEvent(wcEvt)

  await sleep()

  t.deepEqual(
    getListOfAssets(),
    mapExpected([
      '/article-card.css',
      '/my-button.css',
      '/article-card-alt.css',
      '/runtime.js',
      '/product-card.js',
      '/article-card.js',
      '/product-card-alt.js',
      '/my-button.js',
      '/article-card-alt.js'
    ]),
    'should react to "portable:web-component:load" event'
  )
})
