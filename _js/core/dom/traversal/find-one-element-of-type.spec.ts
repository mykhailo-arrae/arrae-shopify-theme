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

test('should ensure that the element is of the correct type', async (t) => {
  const { findOneElementOfType: fet } = t.context.bundle

  const {
    document,
    HTMLElement,
    SVGElement,
    HTMLFormElement,
    HTMLInputElement
  } = t.context.window

  t.is(fet(HTMLElement)(document, ''), null)
  t.is(fet(HTMLElement)(document, '.js-non-existent'), null)
  t.is(
    fet(SVGElement)(document, 'svg.js-element')?.getAttribute('id'),
    'svg-el'
  )

  t.is(fet(HTMLElement)(document, '.js-element')?.getAttribute('id'), 'el-1')

  t.is(
    fet(HTMLElement)(document, '.js-another-element')?.getAttribute('id'),
    'el-2'
  )

  t.is(
    fet(HTMLFormElement)(document, 'form.js-element')?.getAttribute('id'),
    'form-el'
  )

  t.is(
    fet(HTMLInputElement)(document, 'input.js-element')?.getAttribute('id'),
    'input-el'
  )
})
