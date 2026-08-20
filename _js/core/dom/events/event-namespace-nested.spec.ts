import userEvent from '@testing-library/user-event'
import test from 'ava'
import { JSDOM } from 'jsdom'
import { makeEventNamespace } from './index.js'

test('given delegated event listener on nested element click', async (t) => {
  const { window } = new JSDOM(`
    <!DOCTYPE html>
    <section>
      <div>
        <button id="js-trigger-button" class="js-target">
          <svg id="js-trigger-svg" class="js-target" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.984 6.422 13.406 12l5.578 5.578-1.406 1.406L12 13.406l-5.578 5.578-1.406-1.406L10.594 12 5.016 6.422l1.406-1.406L12 10.594l5.578-5.578z"/></svg>
          <span id="js-trigger-span" class="js-target">
            <em id="js-trigger-em" class="js-target">The Mighty</em>
            Button
          </span>
        </button>
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

  const targets: [string | null, HTMLElement][] = []
  const delegateTargets: (HTMLElement | null)[] = []

  const user = userEvent.setup({ document })

  const button = document.querySelector('button')
  const span = document.querySelector('span')
  const em = document.querySelector('em')
  const svg = document.querySelector('svg')

  const section = document.querySelector('section')

  if (
    button == null ||
    span == null ||
    em == null ||
    section == null ||
    svg == null
  ) {
    throw new Error('Target elements not found')
  }

  namespace.addDelegatedEventListener(
    section,
    '.js-target',
    'click',
    (target, evt, delegateTarget) => {
      const id = evt.target instanceof window.Element ? evt.target.id : null
      targets.push([id, target])
      delegateTargets.push(delegateTarget)
    }
  )

  await user.click(button)
  await user.click(span)
  await user.click(em)
  await user.click(svg)

  await user.click(section)

  t.deepEqual(targets, [
    ['js-trigger-button', button],
    ['js-trigger-span', span],
    ['js-trigger-em', em]
  ])

  t.deepEqual(delegateTargets, [section, section, section])

  window.close()
})

test(`given delegated event listener on nested element click, but remove listener before event triggers`, async (t) => {
  const { window } = new JSDOM(`
    <!DOCTYPE html>
    <section>
      <div>
        <button id="js-trigger-button" class="js-target">
          <svg id="js-trigger-svg" class="js-target" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.984 6.422 13.406 12l5.578 5.578-1.406 1.406L12 13.406l-5.578 5.578-1.406-1.406L10.594 12 5.016 6.422l1.406-1.406L12 10.594l5.578-5.578z"/></svg>
          <span id="js-trigger-span" class="js-target">
            <em id="js-trigger-em" class="js-target">The Mighty</em>
            Button
          </span>
        </button>
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

  const targets: [string | null, HTMLElement][] = []
  const delegateTargets: (HTMLElement | null)[] = []

  const user = userEvent.setup({ document })

  const button = document.querySelector('button')
  const span = document.querySelector('span')
  const em = document.querySelector('em')
  const svg = document.querySelector('svg')

  const section = document.querySelector('section')

  if (
    button == null ||
    span == null ||
    em == null ||
    section == null ||
    svg == null
  ) {
    throw new Error('Target elements not found')
  }

  const listener = namespace.addDelegatedEventListener(
    section,
    '.js-target',
    'click',
    (target, evt, delegateTarget) => {
      const id = evt.target instanceof window.Element ? evt.target.id : null
      targets.push([id, target])
      delegateTargets.push(delegateTarget)
    }
  )

  listener.remove()

  await user.click(button)
  await user.click(span)
  await user.click(em)
  await user.click(svg)

  await user.click(section)

  t.deepEqual(targets, [])

  t.deepEqual(delegateTargets, [])

  window.close()
})
