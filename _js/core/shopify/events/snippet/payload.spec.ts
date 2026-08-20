import test from 'ava'
import { JSDOM } from 'jsdom'
import {
  type PortableSnippetEventPayload,
  parseSnippetEventPayload as parse
} from './payload.js'

const macro = test.macro<
  [{ type: string; detail?: unknown }, PortableSnippetEventPayload | null]
>({
  exec: (t, input, expected) => {
    const { window } = new JSDOM(`
      <!DOCTYPE html>
      <div></div>
    `)

    t.teardown(() => {
      window.close()
    })

    const { CustomEvent } = window

    const { type, detail } = input
    const actual = parse(
      new CustomEvent(type, { detail, bubbles: true, cancelable: false })
    )

    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given "${input.type}" event with '${JSON.stringify(
      input.detail
    )}' payload ${providedTitle}`.trim()
  }
})

test(
  'should ignore event with wrong type',
  macro,
  { type: 'click', detail: { sectionId: 'xxx' } },
  null
)

test(
  macro,
  { type: 'portable:snippet:load' },
  { type: 'portable:snippet:load', mode: 'load-children' }
)

test(
  macro,
  { type: 'portable:snippet:load', detail: { mode: 'load-children' } },
  { type: 'portable:snippet:load', mode: 'load-children' }
)

test(
  macro,
  { type: 'portable:snippet:load', detail: { mode: 'self-only' } },
  { type: 'portable:snippet:load', mode: 'self-only' }
)

test(
  'should ignore invalid mode',
  macro,
  { type: 'portable:snippet:load', detail: { mode: 'self' } },
  { type: 'portable:snippet:load', mode: 'load-children' }
)

test(
  macro,
  { type: 'portable:snippet:unload' },
  { type: 'portable:snippet:unload' }
)
