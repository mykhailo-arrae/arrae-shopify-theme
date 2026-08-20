import _test, { type TestFn } from 'ava'
import {
  type Context,
  loadBundleIntoJsdom
} from '../../test/load-bundle-into-jsdom/index.js'
import type * as Bundle from './find-siblings.js'

// This is the only way to set context type in ava :shrug:
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const test = _test as TestFn<Context<typeof Bundle>>

test.beforeEach(async (t) => {
  t.context = await loadBundleIntoJsdom<typeof Bundle>({
    entrypoint: '_js/core/dom/traversal/find-siblings.ts',
    markup: `
<section>
  <div id="el-1">Element 1</div>
  <div id="has-siblings" class="js-element js-target">Element 2</div>
  <div id="el-3" class="js-element">Element 3</div>
  <div id="el-4" class="js-element">Element 4</div>
  <div id="el-5-new" class="js-new-element">Element 5</div>
  <div id="el-6" class="js-element">Element 6</div>
  <div id="el-7-new" class="js-new-element">Element 7</div>
  <svg id="svg-el" class="js-new-element" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <rect width="50%" height="50%" fill="tomato" />
  </svg>
  Text Node
  <form id="form-el" class="js-element" action="">
    <input type="text" name="name" required />
  </form>
  <input id="input-el" class="js-element" type="text" name="name" required />
</section>
<section>
  <div id="not-a-sibling" class="js-no-siblings">Element</div>
</section>
`
  })
})

test.afterEach.always((t) => {
  t.context.closeBrowserContext()
})

test('given sibling elements', async (t) => {
  const { findSiblings } = t.context.bundle

  const { document } = t.context.window

  const getElementId = (el: HTMLElement): string | null => {
    return el.getAttribute('id')
  }

  const target = document.querySelector('.js-target')

  if (!target) {
    throw new Error('Target elements not found')
  }

  const siblingsAll = findSiblings(target, null).map(getElementId)

  t.deepEqual(siblingsAll, [
    'el-1',
    'el-3',
    'el-4',
    'el-5-new',
    'el-6',
    'el-7-new',
    'form-el',
    'input-el'
  ])

  const siblingsSelector1 = findSiblings(target, '.js-element').map(
    getElementId
  )

  t.deepEqual(siblingsSelector1, [
    'el-3',
    'el-4',
    'el-6',
    'form-el',
    'input-el'
  ])

  const siblingsSelector2 = findSiblings(target, '.js-new-element').map(
    getElementId
  )

  t.deepEqual(siblingsSelector2, ['el-5-new', 'el-7-new'])

  const siblingsSelector3 = findSiblings(target, '.js-not-existing-element')

  t.is(siblingsSelector3.length, 0)

  const targetNoSiblings = document.querySelector('.js-no-siblings')

  if (!targetNoSiblings) {
    throw new Error('Target elements not found')
  }

  const siblingsNone = findSiblings(targetNoSiblings, null)

  t.is(siblingsNone.length, 0)
})
