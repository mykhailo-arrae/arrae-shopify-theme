import test from 'ava'
import { loadBundleIntoJsdom } from '../../../test/load-bundle-into-jsdom/index.js'
import type * as Bundle from './index.js'

test('given section events should infer section id from target element', async (t) => {
  const sectionIds = {
    header: 'sections--15029298659431__header',
    hero: 'template--15029298888807__hero_C4QDCj',
    footer: 'footer'
  } as const

  const markup = `
    <div id="not-a-section"></div>
    <div id="shopify-section-${sectionIds.header}" class="shopify-section"></div>
    <div id="shopify-section-${sectionIds.hero}" class="shopify-section"></div>
    <div id="shopify-section-${sectionIds.footer}" class="shopify-section"></div>
  `
  const {
    closeBrowserContext,
    window: { document, HTMLElement },
    bundle: { emitSectionEvent }
  } = await loadBundleIntoJsdom<typeof Bundle>({
    markup,
    entrypoint: '_js/core/shopify/events/section/index.ts'
  })

  t.teardown(closeBrowserContext)

  const journal: (Record<string, unknown> | null)[] = []

  const header = document.getElementById(`shopify-section-${sectionIds.header}`)
  const hero = document.getElementById(`shopify-section-${sectionIds.hero}`)
  const footer = document.getElementById(`shopify-section-${sectionIds.footer}`)
  const notASection = document.getElementById('not-a-section')

  if (header == null || hero == null || footer == null || notASection == null) {
    throw new Error('One or more sections not found')
  }

  const eventTypes = [
    'shopify:section:load',
    'shopify:section:unload',
    'shopify:section:select',
    'shopify:section:deselect'
  ] as const

  eventTypes.forEach((type) => {
    document.addEventListener(type, (evt) => {
      const detail =
        'detail' in evt && evt.detail != null
          ? evt.detail
          : { __typename: 'Empty detail' }

      const target = evt.target instanceof HTMLElement ? evt.target : null

      journal.push({ type, target, detail })
    })
  })

  t.throws(
    () => {
      emitSectionEvent(notASection, {
        type: 'shopify:section:load',
        detail: {}
      })
    },
    {
      message: /does not start with.*shopify-section/
    }
  )

  emitSectionEvent(header, {
    type: 'shopify:section:load',
    detail: { stage: 'initial' }
  })

  emitSectionEvent(header, {
    type: 'shopify:section:load',
    detail: {}
  })

  emitSectionEvent(header, {
    type: 'shopify:section:load',
    detail: { sectionId: 'invalid' }
  })

  emitSectionEvent(header, {
    type: 'shopify:section:unload',
    detail: {}
  })

  emitSectionEvent(header, {
    type: 'shopify:section:select',
    detail: { load: true }
  })

  emitSectionEvent(header, {
    type: 'shopify:section:select',
    detail: {}
  })

  emitSectionEvent(header, {
    type: 'shopify:section:deselect',
    detail: { load: true }
  })

  emitSectionEvent(header, {
    type: 'shopify:section:deselect',
    detail: {}
  })

  emitSectionEvent(hero, {
    type: 'shopify:section:load',
    detail: {}
  })

  emitSectionEvent(footer, {
    type: 'shopify:section:load',
    detail: {}
  })

  t.deepEqual(journal, [
    {
      type: 'shopify:section:load',
      target: header,
      detail: { sectionId: sectionIds.header, stage: 'initial' }
    },
    {
      type: 'shopify:section:load',
      target: header,
      detail: { sectionId: sectionIds.header }
    },
    {
      type: 'shopify:section:load',
      target: header,
      detail: { sectionId: sectionIds.header }
    },
    {
      type: 'shopify:section:unload',
      target: header,
      detail: { sectionId: sectionIds.header }
    },
    {
      type: 'shopify:section:select',
      target: header,
      detail: { sectionId: sectionIds.header, load: true }
    },
    {
      type: 'shopify:section:select',
      target: header,
      detail: { sectionId: sectionIds.header }
    },
    {
      type: 'shopify:section:deselect',
      target: header,
      detail: { sectionId: sectionIds.header, load: true }
    },
    {
      type: 'shopify:section:deselect',
      target: header,
      detail: { sectionId: sectionIds.header }
    },
    {
      type: 'shopify:section:load',
      target: hero,
      detail: { sectionId: sectionIds.hero }
    },
    {
      type: 'shopify:section:load',
      target: footer,
      detail: { sectionId: sectionIds.footer }
    }
  ])
})
