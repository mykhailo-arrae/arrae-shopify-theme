import test from 'ava'
import { loadBundleIntoJsdom } from '../../../test/load-bundle-into-jsdom/index.js'
import type * as Bundle from './index.js'

test('given load event', async (t) => {
  t.plan(1)

  const markup = `
    <div id="snippet-a" class="portable-snippet ProductCard" data-snippet-name="product-card">
    </div>
  `
  const {
    closeBrowserContext,
    window: { document },
    bundle: { emitSnippetEvent }
  } = await loadBundleIntoJsdom<typeof Bundle>({
    markup,
    entrypoint: '_js/core/shopify/events/snippet/index.ts'
  })

  t.teardown(closeBrowserContext)

  const snippet = document.getElementById('snippet-a')

  if (snippet == null) {
    throw new Error('Snippet element not found')
  }

  snippet.addEventListener(
    'portable:snippet:load',
    (evt) => {
      if ('detail' in evt) {
        t.deepEqual(evt.detail, {
          mode: 'load-children',
          snippetName: 'product-card'
        })
        return
      }

      t.fail('Event detail not found')
    },
    { once: true }
  )

  emitSnippetEvent(snippet, { type: 'portable:snippet:load' })
})
