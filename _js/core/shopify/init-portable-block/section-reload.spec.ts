import test from 'ava'
import { loadBundleIntoJsdom } from '../../test/load-bundle-into-jsdom/index.js'
import { sleep } from '../../test/sleep.js'
import type * as Bundle from './index.spec.bundle.js'
import { annotateJournal, type JournalEvent } from './test-helper-journal.js'

const waitUntilDeferredInitialization = () => sleep()

const sectionId = 'sections--15029298659431__product-main'
const sectionHtmlId = `shopify-section-${sectionId}`

const blockAssetScript = (name: string): string =>
  `<script class="json-portable-block-assets" type="application/json">{"blockName":"${name}"}</script>`

test('given section reload events', async (t) => {
  const markup = `
    <div id="${sectionHtmlId}" class="shopify-section ProductMain">
      <div id="block-a" class="shopify-block">
        ${blockAssetScript('_internal-test-a')}
        <p>Block A</p>
      </div>

      <div id="block-b" class="shopify-block">
        ${blockAssetScript('_internal-test-a')}
        <p>Block B</p>
      </div>

      <div id="block-other" class="shopify-block">
        ${blockAssetScript('other-block')}
        <p>Other Block (different name)</p>
      </div>
    </div>
  `

  const {
    closeBrowserContext,
    bundle: {
      InitPortableBlock: { initPortableBlock },
      SectionEvents: { emitSectionEvent }
    },
    window: { document }
  } = await loadBundleIntoJsdom<typeof Bundle>({
    markup,
    entrypoint: './_js/core/shopify/init-portable-block/index.spec.bundle.ts'
  })

  t.teardown(closeBrowserContext)

  const parentSection = document.getElementById(sectionHtmlId)

  if (parentSection == null) {
    throw new Error('Section element not found')
  }

  const blockA = document.getElementById('block-a')
  const blockB = document.getElementById('block-b')
  const blockOther = document.getElementById('block-other')

  if (blockA == null || blockB == null || blockOther == null) {
    throw new Error('Block elements not found')
  }

  const journal: JournalEvent[] = []

  // TEST

  journal.push({ type: 'stage', name: 'page-load' })
  const cleanup = initPortableBlock(
    '_internal-test-a',
    (block, section) => {
      journal.push({
        type: 'load',
        blockId: block.id,
        sectionId: section.id
      })

      return () => {
        journal.push({
          type: 'unload',
          blockId: block.id,
          sectionId: section.id
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

  journal.push({ type: 'stage', name: 'second-top-level-cleanup' })
  cleanup()

  // RESULT

  const expectedJournal: JournalEvent[] = [
    { type: 'stage', name: 'page-load' },
    {
      type: 'load',
      blockId: blockA.id,
      sectionId: parentSection.id
    },
    {
      type: 'load',
      blockId: blockB.id,
      sectionId: parentSection.id
    },
    // nothing should happen on section load event that's marked as initial
    { type: 'stage', name: 'initial-section-load' },
    // on standard section unload then load
    { type: 'stage', name: 'section-unload' },
    {
      type: 'unload',
      blockId: blockA.id,
      sectionId: parentSection.id
    },
    {
      type: 'unload',
      blockId: blockB.id,
      sectionId: parentSection.id
    },
    { type: 'stage', name: 'section-load' },
    {
      type: 'load',
      blockId: blockA.id,
      sectionId: parentSection.id
    },
    {
      type: 'load',
      blockId: blockB.id,
      sectionId: parentSection.id
    },
    // the system should clean up even if section load is not preceded by unload
    { type: 'stage', name: 'section-load-without-unload' },
    {
      type: 'unload',
      blockId: blockA.id,
      sectionId: parentSection.id
    },
    {
      type: 'load',
      blockId: blockA.id,
      sectionId: parentSection.id
    },
    {
      type: 'unload',
      blockId: blockB.id,
      sectionId: parentSection.id
    },
    {
      type: 'load',
      blockId: blockB.id,
      sectionId: parentSection.id
    },
    // on top-level cleanup()
    { type: 'stage', name: 'top-level-cleanup' },
    {
      type: 'unload',
      blockId: blockA.id,
      sectionId: parentSection.id
    },
    {
      type: 'unload',
      blockId: blockB.id,
      sectionId: parentSection.id
    },
    // nothing should happen on the follow-up cleanup() calls
    { type: 'stage', name: 'second-top-level-cleanup' }
  ]

  t.deepEqual(annotateJournal(journal), annotateJournal(expectedJournal))
})

test('blocks outside a section are silently skipped', async (t) => {
  const markup = `
    <div id="${sectionHtmlId}" class="shopify-section ProductMain">
      <div id="block-inside" class="shopify-block">
        ${blockAssetScript('_internal-test-a')}
        <p>Inside section</p>
      </div>
    </div>

    <div id="block-outside" class="shopify-block">
      ${blockAssetScript('_internal-test-a')}
      <p>Outside section</p>
    </div>
  `

  const {
    closeBrowserContext,
    bundle: {
      InitPortableBlock: { initPortableBlock }
    },
    window: { document }
  } = await loadBundleIntoJsdom<typeof Bundle>({
    markup,
    entrypoint: './_js/core/shopify/init-portable-block/index.spec.bundle.ts'
  })

  t.teardown(closeBrowserContext)

  const parentSection = document.getElementById(sectionHtmlId)

  if (parentSection == null) {
    throw new Error('Section element not found')
  }

  const journal: JournalEvent[] = []

  journal.push({ type: 'stage', name: 'page-load' })
  const cleanup = initPortableBlock(
    '_internal-test-a',
    (block, section) => {
      journal.push({
        type: 'load',
        blockId: block.id,
        sectionId: section.id
      })

      return () => {
        journal.push({
          type: 'unload',
          blockId: block.id,
          sectionId: section.id
        })
      }
    },
    { deferred: true }
  )

  await waitUntilDeferredInitialization()

  journal.push({ type: 'stage', name: 'cleanup' })
  cleanup()

  const expectedJournal: JournalEvent[] = [
    { type: 'stage', name: 'page-load' },
    {
      type: 'load',
      blockId: 'block-inside',
      sectionId: parentSection.id
    },
    { type: 'stage', name: 'cleanup' },
    {
      type: 'unload',
      blockId: 'block-inside',
      sectionId: parentSection.id
    }
  ]

  t.deepEqual(annotateJournal(journal), annotateJournal(expectedJournal))
})
