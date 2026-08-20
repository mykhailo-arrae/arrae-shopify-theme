import test from 'ava'
import { loadBundleIntoJsdom } from '../../test/load-bundle-into-jsdom/index.js'
import { sleep } from '../../test/sleep.js'
import type * as Bundle from './index.spec.bundle.js'
import { annotateJournal, type JournalEvent } from './test-helper-journal.js'

const waitUntilDeferredInitialization = () => sleep()

const sectionId = 'sections--15029298659431__product-main'
const sectionHtmlId = `shopify-section-${sectionId}`

test('given section reload events', async (t) => {
  const markup = `
    <div id="${sectionHtmlId}" class="shopify-section ProductMain">
      <div id="snippet-a" class="portable-snippet ProductCard" data-snippet-name="product-card">
        <h2 class="ProductCard_title">Product A</h2>
      </div>

      <article id="snippet-b" class="portable-snippet ProductCard" data-snippet-name="product-card">
        <h2 class="ProductCard_title">Product B</h2>
      </article>
    </div>

    <!-- This snippet is outside the section -->
    <div id="snippet-c" class="portable-snippet ProductCard" data-snippet-name="product-card">
      <h2 class="ProductCard_title">Product C</h2>
    </div>
  `

  const {
    closeBrowserContext,
    bundle: {
      InitSnippet: { initSnippet },
      SectionEvents: { emitSectionEvent }
    },
    window: { document }
  } = await loadBundleIntoJsdom<typeof Bundle>({
    markup,
    entrypoint: './_js/core/shopify/init-snippet/index.spec.bundle.ts'
  })

  t.teardown(closeBrowserContext)

  const parentSection = document.getElementById(sectionHtmlId)

  if (parentSection == null) {
    throw new Error('Section element not found')
  }

  const snippetA = document.getElementById('snippet-a')
  const snippetB = document.getElementById('snippet-b')
  const snippetC = document.getElementById('snippet-c')

  if (snippetA == null || snippetB == null || snippetC == null) {
    throw new Error('Snippet elements not found')
  }

  const journal: JournalEvent[] = []

  // TEST

  journal.push({ type: 'stage', name: 'page-load' })
  const cleanup = initSnippet(
    'product-card',
    (snippet, section) => {
      const _sectionId = section ? section.id : null

      journal.push({
        type: 'load',
        snippetId: snippet.id,
        sectionId: _sectionId
      })

      return () => {
        journal.push({
          type: 'unload',
          snippetId: snippet.id,
          sectionId: _sectionId
        })
      }
    },
    { deferred: true }
  )

  await waitUntilDeferredInitialization()

  journal.push({ type: 'stage', name: 'initial-section-load' })
  emitSectionEvent(parentSection, {
    type: 'shopify:section:load',
    detail: { sectionId, stage: 'initial' }
  })

  journal.push({ type: 'stage', name: 'section-unload' })
  emitSectionEvent(parentSection, {
    type: 'shopify:section:unload',
    detail: { sectionId }
  })

  journal.push({ type: 'stage', name: 'section-load' })
  emitSectionEvent(parentSection, {
    type: 'shopify:section:load',
    detail: { sectionId }
  })

  journal.push({ type: 'stage', name: 'section-load-without-unload' })
  emitSectionEvent(parentSection, {
    type: 'shopify:section:load',
    detail: { sectionId }
  })

  journal.push({ type: 'stage', name: 'top-level-cleanup' })
  cleanup()

  // Simulate accidental second cleanup call
  journal.push({ type: 'stage', name: 'second-top-level-cleanup' })
  cleanup()

  // RESULT

  const expectedJournal: JournalEvent[] = [
    // on initial initSnippet() call
    { type: 'stage', name: 'page-load' },
    {
      type: 'load',
      snippetId: snippetA.id,
      sectionId: parentSection.id
    },
    {
      type: 'load',
      snippetId: snippetB.id,
      sectionId: parentSection.id
    },
    {
      type: 'load',
      snippetId: snippetC.id,
      sectionId: null
    },
    // nothing should happen on section load event that's marked as initial
    { type: 'stage', name: 'initial-section-load' },
    // on standard section unload then load
    { type: 'stage', name: 'section-unload' },
    {
      type: 'unload',
      snippetId: snippetA.id,
      sectionId: parentSection.id
    },
    {
      type: 'unload',
      snippetId: snippetB.id,
      sectionId: parentSection.id
    },
    { type: 'stage', name: 'section-load' },
    {
      type: 'load',
      snippetId: snippetA.id,
      sectionId: parentSection.id
    },
    {
      type: 'load',
      snippetId: snippetB.id,
      sectionId: parentSection.id
    },
    // the system should clean up even if the section load event is not preceded by an unload event
    { type: 'stage', name: 'section-load-without-unload' },
    {
      type: 'unload',
      snippetId: snippetA.id,
      sectionId: parentSection.id
    },
    {
      type: 'load',
      snippetId: snippetA.id,
      sectionId: parentSection.id
    },
    {
      type: 'unload',
      snippetId: snippetB.id,
      sectionId: parentSection.id
    },
    {
      type: 'load',
      snippetId: snippetB.id,
      sectionId: parentSection.id
    },
    // on top-level cleanup()
    { type: 'stage', name: 'top-level-cleanup' },
    {
      type: 'unload',
      snippetId: snippetA.id,
      sectionId: parentSection.id
    },
    {
      type: 'unload',
      snippetId: snippetB.id,
      sectionId: parentSection.id
    },
    {
      type: 'unload',
      snippetId: snippetC.id,
      sectionId: null
    },
    // nothing should happen on the follow-up cleanup() calls
    { type: 'stage', name: 'second-top-level-cleanup' }
  ]

  t.deepEqual(annotateJournal(journal), annotateJournal(expectedJournal))
})
