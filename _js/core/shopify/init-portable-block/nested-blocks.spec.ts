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

test('nested blocks: parent block without its own script must not be initialized', async (t) => {
  const markup = `
    <div id="${sectionHtmlId}" class="shopify-section ProductMain">
      <div id="parent-block" class="shopify-block">
        <p>Parent block has no asset script of its own</p>
        <div id="child-block" class="shopify-block">
          ${blockAssetScript('_internal-test-a')}
          <p>Child block owns the script</p>
        </div>
      </div>

      <div id="flat-block" class="shopify-block">
        ${blockAssetScript('_internal-test-a')}
        <p>Flat block at section level</p>
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

  const parentBlock = document.getElementById('parent-block')
  const childBlock = document.getElementById('child-block')
  const flatBlock = document.getElementById('flat-block')

  if (parentBlock == null || childBlock == null || flatBlock == null) {
    throw new Error('Block elements not found')
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

  journal.push({ type: 'stage', name: 'top-level-cleanup' })
  cleanup()

  const expectedJournal: JournalEvent[] = [
    { type: 'stage', name: 'page-load' },
    {
      type: 'load',
      blockId: childBlock.id,
      sectionId: parentSection.id
    },
    {
      type: 'load',
      blockId: flatBlock.id,
      sectionId: parentSection.id
    },
    { type: 'stage', name: 'section-unload' },
    {
      type: 'unload',
      blockId: childBlock.id,
      sectionId: parentSection.id
    },
    {
      type: 'unload',
      blockId: flatBlock.id,
      sectionId: parentSection.id
    },
    { type: 'stage', name: 'section-load' },
    {
      type: 'load',
      blockId: childBlock.id,
      sectionId: parentSection.id
    },
    {
      type: 'load',
      blockId: flatBlock.id,
      sectionId: parentSection.id
    },
    { type: 'stage', name: 'top-level-cleanup' },
    {
      type: 'unload',
      blockId: childBlock.id,
      sectionId: parentSection.id
    },
    {
      type: 'unload',
      blockId: flatBlock.id,
      sectionId: parentSection.id
    }
  ]

  t.deepEqual(annotateJournal(journal), annotateJournal(expectedJournal))
})
