import test from 'ava'
import { JSDOM } from 'jsdom'
import {
  parseSectionEventPayload as parse,
  type ShopifySectionEventPayload
} from './payload.js'

const macro = test.macro<
  [{ type: string; detail?: unknown }, ShopifySectionEventPayload | null]
>({
  exec: (t, input, expected) => {
    const { window } = new JSDOM(`
      <!DOCTYPE html>
      <div></div>
    `)

    const { CustomEvent } = window

    const { type, detail } = input
    const actual = parse(
      new CustomEvent(type, { detail, bubbles: true, cancelable: false })
    )

    t.deepEqual(actual, expected)

    window.close()
  },
  title: (providedTitle = '', input) => {
    return `given "${input.type}" event with '${JSON.stringify(
      input.detail
    )}' payload ${providedTitle}`.trim()
  }
})

test(macro, { type: 'click', detail: { sectionId: 'xxx' } }, null)

test(macro, { type: 'shopify:section:load' }, null)
test(macro, { type: 'shopify:section:unload' }, null)
test(macro, { type: 'shopify:section:select' }, null)
test(macro, { type: 'shopify:section:deselect' }, null)

test(macro, { type: 'shopify:section:load', detail: {} }, null)
test(macro, { type: 'shopify:section:load', detail: { sectionId: '' } }, null)
test(macro, { type: 'shopify:section:load', detail: { sectionId: 1 } }, null)
test(macro, { type: 'shopify:section:load', detail: { sectionId: null } }, null)

test(
  macro,
  { type: 'shopify:section:load', detail: { sectionId: 'xxx' } },
  { type: 'shopify:section:load', detail: { sectionId: 'xxx', stage: null } }
)

test(
  macro,
  {
    type: 'shopify:section:load',
    detail: { sectionId: 'xxx', stage: 'initial' }
  },
  {
    type: 'shopify:section:load',
    detail: { sectionId: 'xxx', stage: 'initial' }
  }
)

test(
  'should accept only "initial" stage',
  macro,
  {
    type: 'shopify:section:load',
    detail: { sectionId: 'xxx', stage: 'invalid' }
  },
  { type: 'shopify:section:load', detail: { sectionId: 'xxx', stage: null } }
)

test(
  macro,
  { type: 'shopify:section:unload', detail: { sectionId: 'xxx' } },
  { type: 'shopify:section:unload', detail: { sectionId: 'xxx' } }
)

test(
  macro,
  { type: 'shopify:section:deselect', detail: { sectionId: 'xxx' } },
  { type: 'shopify:section:deselect', detail: { sectionId: 'xxx' } }
)

test(
  macro,
  { type: 'shopify:section:select', detail: { sectionId: 'xxx' } },
  { type: 'shopify:section:select', detail: { sectionId: 'xxx', load: false } }
)

test(
  macro,
  { type: 'shopify:section:select', detail: { sectionId: 'xxx', load: true } },
  { type: 'shopify:section:select', detail: { sectionId: 'xxx', load: true } }
)
