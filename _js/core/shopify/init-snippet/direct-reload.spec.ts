import test from 'ava'
import { loadBundleIntoJsdom } from '../../test/load-bundle-into-jsdom/index.js'
import { sleep } from '../../test/sleep.js'
import type * as Bundle from './index.spec.bundle.js'
import { annotateJournal, type JournalEvent } from './test-helper-journal.js'

const waitUntilDeferredInitialization = () => sleep()

test('given direct reload events', async (t) => {
  const markup = `
    <div id="snippet-a" class="portable-snippet ProductCard" data-snippet-name="product-card">
      <h2 class="ProductCard_title">Product A</h2>
    </div>

    <article id="snippet-b" class="portable-snippet ProductCard" data-snippet-name="product-card">
      <h2 class="ProductCard_title">Product B</h2>
    </article>
  `

  const {
    closeBrowserContext,
    bundle: {
      InitSnippet: { initSnippet },
      SnippetEvents: { emitSnippetEvent }
    },
    window: { document }
  } = await loadBundleIntoJsdom<typeof Bundle>({
    markup,
    entrypoint: './_js/core/shopify/init-snippet/index.spec.bundle.ts'
  })

  t.teardown(closeBrowserContext)

  const snippetA = document.getElementById('snippet-a')
  const snippetB = document.getElementById('snippet-b')

  if (snippetA == null || snippetB == null) {
    throw new Error('Snippet elements not found')
  }

  const journal: JournalEvent[] = []

  // TEST

  journal.push({ type: 'stage', name: 'page-load' })

  const cleanup = initSnippet(
    'product-card',
    (snippet) => {
      journal.push({
        type: 'load',
        snippetId: snippet.id,
        sectionId: null
      })

      return () => {
        journal.push({ type: 'unload', snippetId: snippet.id, sectionId: null })
      }
    },
    { deferred: true }
  )

  await waitUntilDeferredInitialization()

  journal.push({ type: 'stage', name: 'snippet-a-load-without-unload' })
  emitSnippetEvent(snippetA, { type: 'portable:snippet:load' })

  journal.push({ type: 'stage', name: 'snippet-a-unload' })
  emitSnippetEvent(snippetA, { type: 'portable:snippet:unload' })

  journal.push({ type: 'stage', name: 'snippet-a-load' })
  emitSnippetEvent(snippetA, { type: 'portable:snippet:load' })

  journal.push({ type: 'stage', name: 'snippet-b-unload' })
  emitSnippetEvent(snippetB, { type: 'portable:snippet:unload' })

  journal.push({ type: 'stage', name: 'snippet-b-load' })
  emitSnippetEvent(snippetB, { type: 'portable:snippet:load' })

  journal.push({ type: 'stage', name: 'top-level-cleanup' })
  cleanup()

  journal.push({ type: 'stage', name: 'second-top-level-cleanup' })
  cleanup()

  // RESULT

  const expectedJournal: JournalEvent[] = [
    // on initial initSnippet() call
    { type: 'stage', name: 'page-load' },
    {
      type: 'load',
      snippetId: snippetA.id,
      sectionId: null
    },
    {
      type: 'load',
      snippetId: snippetB.id,
      sectionId: null
    },
    { type: 'stage', name: 'snippet-a-load-without-unload' },
    {
      type: 'unload',
      snippetId: snippetA.id,
      sectionId: null
    },
    {
      type: 'load',
      snippetId: snippetA.id,
      sectionId: null
    },
    { type: 'stage', name: 'snippet-a-unload' },
    {
      type: 'unload',
      snippetId: snippetA.id,
      sectionId: null
    },
    { type: 'stage', name: 'snippet-a-load' },
    {
      type: 'load',
      snippetId: snippetA.id,
      sectionId: null
    },
    { type: 'stage', name: 'snippet-b-unload' },
    {
      type: 'unload',
      snippetId: snippetB.id,
      sectionId: null
    },
    { type: 'stage', name: 'snippet-b-load' },
    {
      type: 'load',
      snippetId: snippetB.id,
      sectionId: null
    },
    { type: 'stage', name: 'top-level-cleanup' },
    {
      type: 'unload',
      snippetId: snippetA.id,
      sectionId: null
    },
    {
      type: 'unload',
      snippetId: snippetB.id,
      sectionId: null
    },
    // nothing should happen on the follow-up cleanup() calls
    { type: 'stage', name: 'second-top-level-cleanup' }
  ]

  t.deepEqual(annotateJournal(journal), annotateJournal(expectedJournal))
})
