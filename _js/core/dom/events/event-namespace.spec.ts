import userEvent from '@testing-library/user-event'
import test from 'ava'
import { JSDOM } from 'jsdom'
import { makeEventNamespace } from './index.js'

test(`given delegated event listener on document, but destroy namespace before the event triggers`, async (t) => {
  const { window } = new JSDOM(`
    <!DOCTYPE html>
    <section>
      <button class="js-delegated-event">The Button</button>
    </section>
  `)

  const { AbortController, HTMLElement, SVGElement, document } = window

  const namespace = makeEventNamespace({
    AbortController,
    HTMLElement,
    SVGElement,
    document
  })

  const targets: HTMLElement[] = []
  const delegateTargets: Document[] = []

  namespace.addDelegatedEventListener(
    document,
    '.js-delegated-event',
    'click',
    (target, evt, delegateTarget) => {
      targets.push(target)
      delegateTargets.push(delegateTarget)
    }
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
      namespace.addDelegatedEventListener(
        document,
        '.js-delegated-event',
        'click',
        (target) => {
          targets.push(target)
        }
      )
    },
    { message: /namespace already destroyed/i },
    'should not allow adding listeners if the namespace is destroyed'
  )

  // Try to click the button again
  await user.click(button)

  t.deepEqual(targets, [button])
  t.deepEqual(delegateTargets, [document])

  window.close()
})

test(`given delegated event listener on element`, async (t) => {
  const { window } = new JSDOM(`
    <!DOCTYPE html>
    <section>
      <div>
        <button class="js-delegated-event">The Button</button>
      </div>
    </section>
  `)

  const { AbortController, HTMLElement, SVGElement, document } = window

  const namespace = makeEventNamespace({
    AbortController,
    HTMLElement,
    SVGElement,
    document
  })

  const targets: HTMLElement[] = []
  const delegateTargets: (HTMLElement | Document | null)[] = []

  const user = userEvent.setup({ document })

  const button = document.querySelector('button')
  const section = document.querySelector('section')

  if (button == null || section == null) {
    throw new Error('Target elements not found')
  }

  namespace.addDelegatedEventListener(
    section,
    '.js-delegated-event',
    'click',
    (target, evt, delegateTarget) => {
      targets.push(target)
      delegateTargets.push(delegateTarget)
    }
  )

  await user.click(button)
  await user.click(section)

  t.is(targets.length, 1)
  t.is(targets.at(0), button)

  t.is(delegateTargets.length, 1)
  t.is(delegateTargets.at(0), section)

  window.close()
})

test(`given delegated event listener on nested element click, but remove listener before event triggers`, async (t) => {
  const { window } = new JSDOM(`
    <!DOCTYPE html>
    <section>
      <div>
        <button class="js-delegated-event">The Button</button>
      </div>
    </section>
  `)

  const { AbortController, HTMLElement, SVGElement, document } = window

  const namespace = makeEventNamespace({
    AbortController,
    HTMLElement,
    SVGElement,
    document
  })

  const targets: HTMLElement[] = []
  const delegateTargets: (HTMLElement | Document | null)[] = []

  const user = userEvent.setup({ document })

  const button = document.querySelector('button')
  const section = document.querySelector('section')

  if (button == null || section == null) {
    throw new Error('Target elements not found')
  }

  const listener = namespace.addDelegatedEventListener(
    section,
    '.js-delegated-event',
    'click',
    () => {
      // unreachable
    }
  )

  listener.remove()

  await user.click(button)
  await user.click(section)

  t.is(targets.length, 0)
  t.is(delegateTargets.length, 0)

  window.close()
})
