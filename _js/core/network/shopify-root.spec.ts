import _test, { type TestFn } from 'ava'
import {
  type Context,
  loadBundleIntoJsdom
} from '../test/load-bundle-into-jsdom/index.js'
import type * as Bundle from './shopify-root.js'

// This is the only way to set context type in ava :shrug:
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const test = _test as TestFn<Context<typeof Bundle>>

test.beforeEach(async (t) => {
  t.context = await loadBundleIntoJsdom<typeof Bundle>({
    entrypoint: '_js/core/network/shopify-root.ts',
    markup: '<div></div>',
    url: 'https://a.com'
  })
})

test.afterEach.always((t) => {
  t.context.closeBrowserContext()
})

test('given no Shopify root', (t) => {
  const { getShopifyRoot, atShopifyRoot } = t.context.bundle

  t.is(getShopifyRoot(), '/')

  t.is(
    atShopifyRoot('cart/update.js').toString(),
    `https://a.com/cart/update.js`
  )
})

test('given an invalid Shopify root', (t) => {
  const { getShopifyRoot } = t.context.bundle

  t.context.window.Shopify = { routes: { root: undefined } }
  t.is(getShopifyRoot(), '/')

  t.context.window.Shopify = { routes: { root: null } }
  t.is(getShopifyRoot(), '/')

  t.context.window.Shopify = { routes: { root: '' } }
  t.is(getShopifyRoot(), '/')
})

test('given a standard Shopify root', (t) => {
  const { getShopifyRoot, atShopifyRoot } = t.context.bundle

  t.context.window.Shopify = { routes: { root: '/' } }

  t.is(getShopifyRoot(), '/')

  t.is(
    atShopifyRoot('cart/update.js').toString(),
    `https://a.com/cart/update.js`
  )

  t.is(
    atShopifyRoot('/cart/update.js').toString(),
    `https://a.com/cart/update.js`
  )
})

test('given a regional Shopify root', (t) => {
  const { getShopifyRoot, atShopifyRoot } = t.context.bundle

  t.context.window.Shopify = { routes: { root: '/en-pl/' } }

  t.is(getShopifyRoot(), '/en-pl/')

  t.is(
    atShopifyRoot('cart/update.js').toString(),
    `https://a.com/en-pl/cart/update.js`
  )

  t.is(
    atShopifyRoot('/cart/update.js').toString(),
    `https://a.com/en-pl/cart/update.js`
  )
})
