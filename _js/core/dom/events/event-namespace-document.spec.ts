import userEvent from '@testing-library/user-event'
import test from 'ava'
import { JSDOM } from 'jsdom'
import { makeEventNamespace } from './index.js'

test(`given document event listener for click`, async (t) => {
  const { window } = new JSDOM(`
    <!DOCTYPE html>
    <section>
      <button>The Button</button>
    </section>
  `)

  const { AbortController, HTMLElement, SVGElement, document } = window

  const namespace = makeEventNamespace({
    AbortController,
    HTMLElement,
    SVGElement,
    document
  })

  const targets: (HTMLElement | null)[] = []

  namespace.addDocumentEventListener(
    'click',
    (evt) => {
      targets.push(evt.target instanceof window.HTMLElement ? evt.target : null)
    },
    {}
  )

  const user = userEvent.setup({ document })

  const button = document.querySelector('button')
  const section = document.querySelector('section')

  if (button == null || section == null) {
    throw new Error('Target elements not found')
  }

  await user.click(button)
  await user.click(section)

  namespace.destroy()

  t.throws(
    () => {
      namespace.addDocumentEventListener(
        'click',
        () => {
          // unreachable
        },
        {}
      )
    },
    { message: /namespace already destroyed/i },
    'should not allow adding listeners if the namespace is destroyed'
  )

  // Try to click the button again
  await user.click(button)

  t.is(targets.length, 2)
  t.is(targets.at(0), button)
  t.is(targets.at(1), section)

  window.close()
})

test(`given document event listener for custom event`, async (t) => {
  const { window } = new JSDOM(`
    <!DOCTYPE html>
    <section>
      <button>The Button</button>
    </section>
  `)

  const { AbortController, HTMLElement, SVGElement, document } = window

  const namespace = makeEventNamespace({
    AbortController,
    HTMLElement,
    SVGElement,
    document
  })

  const evts: unknown[] = []

  const customEvent = new window.CustomEvent('custom_event')

  namespace.addDocumentEventListener(
    'custom_event',
    (evt) => {
      evts.push(evt)
    },
    {}
  )

  document.dispatchEvent(customEvent)

  t.is(evts.length, 1)
  t.is(evts.at(0), customEvent)

  window.close()
})

test(`given document event listener, but remove listener before event triggers`, async (t) => {
  const { window } = new JSDOM(`
    <!DOCTYPE html>
    <section>
      <button>The Button</button>
    </section>
  `)

  const { AbortController, HTMLElement, SVGElement, document } = window

  const namespace = makeEventNamespace({
    AbortController,
    HTMLElement,
    SVGElement,
    document
  })

  const targets: (HTMLElement | null)[] = []

  const listener = namespace.addDocumentEventListener(
    'click',
    (evt) => {
      targets.push(evt.target instanceof window.HTMLElement ? evt.target : null)
    },
    {}
  )

  listener.remove()

  const user = userEvent.setup({ document })

  const button = document.querySelector('button')
  const section = document.querySelector('section')

  if (button == null || section == null) {
    throw new Error('Target elements not found')
  }

  await user.click(button)
  await user.click(section)

  t.is(targets.length, 0)

  window.close()
})
