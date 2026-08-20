import test from 'ava'
import { loadBundleIntoJsdom } from '../../test/load-bundle-into-jsdom/index.js'
import type * as Bundle from './init-section.spec.bundle.js'

type LogLine =
  | { action: 'stage'; name: string }
  | {
      action: 'init'
      sectionId: string
    }
  | {
      action: 'cleanup'
      sectionId: string
    }

const sectionId = 'sections--15029298659431__product-main'
const sectionHtmlId = `shopify-section-${sectionId}`

test('given portable section', async (t) => {
  const markup = `
    <div id="${sectionHtmlId}" class="js-product-main shopify-section ProductMain">
  `
  const {
    closeBrowserContext,
    window: { document },
    bundle: {
      InitSection: { initSection },
      SectionEvents: { emitSectionEvent }
    }
  } = await loadBundleIntoJsdom<typeof Bundle>({
    markup,
    entrypoint: '_js/core/shopify/init-section/init-section.spec.bundle.ts'
  })

  t.teardown(closeBrowserContext)

  const section = document.getElementById(sectionHtmlId)

  if (section == null) {
    throw new Error('Section element not found')
  }

  const journal: LogLine[] = []

  const waitUntilDeferredInitialization = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
  }

  // TEST

  journal.push({ action: 'stage', name: 'page-load' })

  const cleanup = initSection(
    '.js-product-main',
    (s) => {
      journal.push({
        action: 'init',
        sectionId: s.id
      })

      return {
        unload: () => {
          journal.push({ action: 'cleanup', sectionId: s.id })
        }
      }
    },
    { deferred: true }
  )

  journal.push({ action: 'stage', name: 'section-unload-before-deferred-init' })
  emitSectionEvent(section, {
    type: 'shopify:section:unload',
    detail: { sectionId }
  })

  await waitUntilDeferredInitialization()

  journal.push({ action: 'stage', name: 'section-unload' })
  emitSectionEvent(section, {
    type: 'shopify:section:unload',
    detail: { sectionId }
  })

  journal.push({ action: 'stage', name: 'section-load' })
  emitSectionEvent(section, {
    type: 'shopify:section:load',
    detail: { sectionId }
  })

  journal.push({ action: 'stage', name: 'top-level-cleanup' })
  cleanup()

  // Simulate accidental second cleanup call
  journal.push({ action: 'stage', name: 'second-top-level-cleanup' })
  cleanup()

  // RESULTS

  const expectedJournal: LogLine[] = [
    { action: 'stage', name: 'page-load' },
    // nothing should happen
    { action: 'stage', name: 'section-unload-before-deferred-init' },
    {
      action: 'init',
      sectionId: section.id
    },
    { action: 'stage', name: 'section-unload' },
    {
      action: 'cleanup',
      sectionId: section.id
    },
    { action: 'stage', name: 'section-load' },
    {
      action: 'init',
      sectionId: section.id
    },
    { action: 'stage', name: 'top-level-cleanup' },
    {
      action: 'cleanup',
      sectionId: section.id
    },
    // nothing should happen on the follow-up top-level cleanup() calls
    { action: 'stage', name: 'second-top-level-cleanup' }
  ]

  t.deepEqual(journal, expectedJournal)
})
