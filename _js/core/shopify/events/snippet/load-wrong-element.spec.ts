import test from 'ava'
import { loadBundleIntoJsdom } from '../../../test/load-bundle-into-jsdom/index.js'
import type * as Bundle from './index.js'

test('given load event on an element with missing classname', async (t) => {
  const markup = `
    <div id="snippet-a" class="ProductCard" data-snippet-name="product-card"></div>
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

  t.throws(
    () => {
      emitSnippetEvent(snippet, { type: 'portable:snippet:load' })
    },
    { message: /snippet.*class/i }
  )
})

test('given load event on an element with missing data attribute', async (t) => {
  const markup = `
    <div id="snippet-a" class="portable-snippet ProductCard"></div>
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

  t.throws(
    () => {
      emitSnippetEvent(snippet, { type: 'portable:snippet:load' })
    },
    { message: /snippet.*data-snippet-name/i }
  )
})
