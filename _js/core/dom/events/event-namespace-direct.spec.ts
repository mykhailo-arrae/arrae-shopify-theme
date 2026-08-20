import userEvent from '@testing-library/user-event'
import test from 'ava'
import { JSDOM } from 'jsdom'
import { makeEventNamespace } from './index.js'

test(`given direct event listener on an element`, async (t) => {
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

  const button = document.querySelector('button')
  const section = document.querySelector('section')

  if (button == null || section == null) {
    throw new Error('Target elements not found')
  }

  const targets: HTMLElement[] = []

  namespace.addDirectEventListener(section, 'click', (target) => {
    targets.push(target)
  })

  const user = userEvent.setup({ document })

  await user.click(button)
  await user.click(section)

  namespace.destroy()

  t.throws(
    () => {
      namespace.addDirectEventListener(section, 'click', () => {
        // unreachable
      })
    },
    { message: /namespace already destroyed/i },
    'should not allow adding listeners if the namespace is destroyed'
  )

  // Try to click the button again
  await user.click(button)

  t.deepEqual(
    targets,
    [section, section],
    'should include bubbling event from button'
  )

  window.close()
})

test(`given direct event listener on an element, but remove listener before event`, async (t) => {
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

  const button = document.querySelector('button')
  const section = document.querySelector('section')

  if (button == null || section == null) {
    throw new Error('Target elements not found')
  }

  const targets: HTMLElement[] = []

  const listener = namespace.addDirectEventListener(
    section,
    'click',
    (target) => {
      targets.push(target)
    }
  )

  listener.remove()

  const user = userEvent.setup({ document })

  await user.click(button)
  await user.click(section)

  t.deepEqual(targets, [], 'should not include any targets')

  window.close()
})
