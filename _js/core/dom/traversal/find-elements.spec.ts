import _test, { type TestFn } from 'ava'
import {
  type Context,
  loadBundleIntoJsdom
} from '../../test/load-bundle-into-jsdom/index.js'
import type * as Bundle from './index.js'

// This is the only way to set context type in ava :shrug:
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const test = _test as TestFn<Context<typeof Bundle>>

test.beforeEach(async (t) => {
  t.context = await loadBundleIntoJsdom<typeof Bundle>({
    entrypoint: '_js/core/dom/traversal/index.ts',
    markup: `
<section id="section-1">
  <div id="el-1" class="js-element">Element 1</div>
  <span id="el-2" class="js-another-element">Element 2</span>
  <div id="el-3" class="js-element">Element 3</div>
  <svg id="svg-el" class="js-element" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <rect width="50%" height="50%" fill="tomato" />
  </svg>
  Text Node
  <form id="form-el" class="js-element" action="">
    <input type="text" name="name" required />
  </form>
  <input id="input-el" class="js-element" type="text" name="name" required />
</section>
<section id="section-2">
  <div id="section-2-el" class="js-element">Element</div>
</section>
<section id="section-3"></section>
`
  })
})

test.afterEach.always((t) => {
  t.context.closeBrowserContext()
})

test('given document tree', async (t) => {
  const { findElements, findOneElement } = t.context.bundle

  const { document } = t.context.window

  const getElementId = (el: HTMLElement): string | null => {
    return el.getAttribute('id')
  }

  t.deepEqual(findElements(document, ''), [])

  t.deepEqual(findElements(document, '.js-element').map(getElementId), [
    'el-1',
    'el-3',
    'form-el',
    'input-el',
    'section-2-el'
  ])

  t.deepEqual(findElements(document, '.js-another-element').map(getElementId), [
    'el-2'
  ])

  t.deepEqual(
    findElements(document.getElementById('section-1'), '.js-element').map(
      getElementId
    ),
    ['el-1', 'el-3', 'form-el', 'input-el']
  )

  t.deepEqual(
    findElements(document.getElementById('section-2'), '.js-element').map(
      getElementId
    ),
    ['section-2-el']
  )

  t.deepEqual(
    findElements(document.getElementById('section-3'), '.js-element').map(
      getElementId
    ),
    []
  )

  // Find one element

  t.is(findOneElement(document, ''), null)
  t.is(findOneElement(document, '.js-non-existent'), null)
  t.is(findOneElement(document, 'svg.js-element'), null)

  t.is(findOneElement(document, '.js-element')?.getAttribute('id'), 'el-1')

  t.is(
    findOneElement(document, '.js-another-element')?.getAttribute('id'),
    'el-2'
  )

  t.is(
    findOneElement(document, 'form.js-element')?.getAttribute('id'),
    'form-el'
  )

  t.is(
    findOneElement(document, 'input.js-element')?.getAttribute('id'),
    'input-el'
  )
})
