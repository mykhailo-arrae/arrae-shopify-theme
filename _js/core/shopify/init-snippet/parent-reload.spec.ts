import test from 'ava'
import { loadBundleIntoJsdom } from '../../test/load-bundle-into-jsdom/index.js'
import { sleep } from '../../test/sleep.js'
import type * as Bundle from './index.spec.bundle.js'
import { annotateJournal, type JournalEvent } from './test-helper-journal.js'

const waitUntilDeferredInitialization = () => sleep()

test('given parent snippet reload events', async (t) => {
  const markup = `
    <div id="snippet-a" class="portable-snippet" data-snippet-name="product-card">
      <h2 class="ProductCard_title">Product A</h2>

      <div id="snippet-b" class="portable-snippet" data-snippet-name="product-card-details">
        <p>Details</p>
      </div>
    </div>

    <!-- This snippet doesn't have a parent snippet -->
    <div id="snippet-c" class="portable-snippet" data-snippet-name="product-card-details">
      <p>Details</p>
    </div>
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
  const snippetC = document.getElementById('snippet-c')

  if (snippetA == null || snippetB == null || snippetC == null) {
    throw new Error('Snippet elements not found')
  }

  const journal: JournalEvent[] = []

  // TEST

  journal.push({ type: 'stage', name: 'page-load' })
  initSnippet(
    'product-card',
    (snippet, section) => {
      const _sectionId = section ? section.id : null

      journal.push({
        type: 'load',
        snippetName: 'product-card',
        snippetId: snippet.id,
        sectionId: _sectionId
      })

      return () => {
        journal.push({
          type: 'unload',
          snippetName: 'product-card',
          snippetId: snippet.id,
          sectionId: _sectionId
        })
      }
    },
    { deferred: true }
  )

  initSnippet(
    'product-card-details',
    (snippet, section) => {
      const _sectionId = section ? section.id : null

      journal.push({
        type: 'load',
        snippetName: 'product-card-details',
        snippetId: snippet.id,
        sectionId: _sectionId
      })

      return () => {
        journal.push({
          type: 'unload',
          snippetName: 'product-card-details',
          snippetId: snippet.id,
          sectionId: _sectionId
        })
      }
    },
    { deferred: true }
  )

  await waitUntilDeferredInitialization()

  journal.push({ type: 'stage', name: 'parent-unload' })
  emitSnippetEvent(snippetA, {
    type: 'portable:snippet:unload'
  })

  journal.push({ type: 'stage', name: 'parent-load' })
  emitSnippetEvent(snippetA, {
    type: 'portable:snippet:load'
  })

  journal.push({ type: 'stage', name: 'child-unload' })
  emitSnippetEvent(snippetB, {
    type: 'portable:snippet:unload'
  })

  journal.push({ type: 'stage', name: 'child-load' })
  emitSnippetEvent(snippetB, {
    type: 'portable:snippet:load'
  })

  journal.push({ type: 'stage', name: 'standalone-unload' })
  emitSnippetEvent(snippetC, {
    type: 'portable:snippet:unload'
  })

  journal.push({ type: 'stage', name: 'standalone-load' })
  emitSnippetEvent(snippetC, {
    type: 'portable:snippet:load'
  })

  // RESULT

  const expectedJournal: JournalEvent[] = [
    { type: 'stage', name: 'page-load' },
    {
      type: 'load',
      snippetId: snippetA.id,
      snippetName: 'product-card',
      sectionId: null
    },
    {
      type: 'load',
      snippetId: snippetB.id,
      snippetName: 'product-card-details',
      sectionId: null
    },
    {
      type: 'load',
      snippetId: snippetC.id,
      snippetName: 'product-card-details',
      sectionId: null
    },
    { type: 'stage', name: 'parent-unload' },
    {
      type: 'unload',
      snippetId: snippetB.id,
      snippetName: 'product-card-details',
      sectionId: null
    },
    {
      type: 'unload',
      snippetId: snippetA.id,
      snippetName: 'product-card',
      sectionId: null
    },
    { type: 'stage', name: 'parent-load' },
    {
      type: 'load',
      snippetId: snippetB.id,
      snippetName: 'product-card-details',
      sectionId: null
    },
    {
      type: 'load',
      snippetId: snippetA.id,
      snippetName: 'product-card',
      sectionId: null
    },
    { type: 'stage', name: 'child-unload' },
    {
      type: 'unload',
      snippetId: snippetB.id,
      snippetName: 'product-card-details',
      sectionId: null
    },
    { type: 'stage', name: 'child-load' },
    {
      type: 'load',
      snippetId: snippetB.id,
      snippetName: 'product-card-details',
      sectionId: null
    },
    { type: 'stage', name: 'standalone-unload' },
    {
      type: 'unload',
      snippetId: snippetC.id,
      snippetName: 'product-card-details',
      sectionId: null
    },
    { type: 'stage', name: 'standalone-load' },
    {
      type: 'load',
      snippetId: snippetC.id,
      snippetName: 'product-card-details',
      sectionId: null
    }
  ]

  t.deepEqual(annotateJournal(journal), annotateJournal(expectedJournal))
})
