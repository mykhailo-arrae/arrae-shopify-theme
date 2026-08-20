import test from 'ava'
import { sleep } from '../core/process/sleep.js'
import { loadBundleIntoJsdom } from '../core/test/load-bundle-into-jsdom/index.js'
import type * as Bundle from './index.js'
import type { Manifest } from './manifest.js'

test('given portable snippets', async (t) => {
  const manifest: Manifest = {
    templateDir: 'none',
    templateName: 'product',
    entries: [
      {
        info: { type: 'snippet', name: 'product-card' },
        assets: [
          { name: 'runtime.js', src: '/runtime.js' },
          { name: 'product-card.js', src: '/product-card.js' }
        ]
      },
      {
        info: { type: 'snippet', name: 'product-card-details' },
        assets: [
          { name: 'runtime.js', src: '/runtime.js' },
          { name: 'product-card-details.js', src: '/product-card-details.js' }
        ]
      },
      {
        info: { type: 'snippet', name: 'article-card' },
        assets: [
          { name: 'runtime.js', src: '/runtime.js' },
          { name: 'article-card.js', src: '/article-card.js' }
        ]
      }
    ]
  }

  const markup = `
    <script class="json-asset-manifest" type="application/json">
      ${JSON.stringify(manifest)}
    </script>
    <div id="snippet-a" class="portable-snippet ProductCard" data-snippet-name="product-card">
      <div id="snippet-b" class="portable-snippet" data-snippet-name="product-card-details"></div>
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

  const { document, CustomEvent, HTMLScriptElement } = window

  const snippetA = document.getElementById('snippet-a')
  const snippetB = document.getElementById('snippet-b')

  if (snippetA == null || snippetB == null) {
    throw new Error('Snippet elements not found')
  }

  const snippetC = document.createElement('div')
  snippetC.setAttribute('data-snippet-name', 'article-card')
  snippetC.classList.add('portable-snippet')
  snippetC.id = 'snippet-c'

  document.body.appendChild(snippetC)

  const evt = new CustomEvent('portable:snippet:load', { bubbles: true })
  snippetC.dispatchEvent(evt)

  await sleep()

  const actual = [...document.querySelectorAll('script')].flatMap((el) => {
    return el instanceof HTMLScriptElement && el.src ? [el.src] : []
  })

  const expected = [
    '/runtime.js',
    '/product-card.js',
    '/product-card-details.js',
    '/article-card.js'
  ].map((src) => new URL(src, url).href)

  t.deepEqual(actual, expected)
})
