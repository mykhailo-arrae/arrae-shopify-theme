import test from 'ava'
import { sleep } from '../core/process/sleep.js'
import { loadBundleIntoJsdom } from '../core/test/load-bundle-into-jsdom/index.js'
import type * as Bundle from './index.js'
import type { Manifest } from './manifest.js'

const _manifest: Manifest = {
  templateDir: 'none',
  templateName: 'product',
  entries: [
    {
      info: { type: 'collection', name: 'search' },
      assets: [
        { name: 'shared-runtime.js', src: '/shared-runtime.js' },
        { name: 'collection-search.js', src: '/collection-search.js' }
      ]
    },
    {
      info: { type: 'customer', name: 'addresses' },
      assets: [
        { name: 'shared-runtime.js', src: '/shared-runtime.js' },
        { name: 'shared-geolocation.js', src: '/shared-geolocation.js' },
        { name: 'customer-addresses.js', src: '/customer-addresses.js' }
      ]
    },
    {
      info: { type: 'home', name: 'hero' },
      assets: [
        { name: 'shared-runtime.js', src: '/shared-runtime.js' },
        { name: 'shared-swiper.js', src: '/shared-swiper.js' },
        { name: 'home-hero.js', src: '/home-hero.js' }
      ]
    },
    {
      info: { type: 'product', name: 'main' },
      assets: [
        { name: 'shared-runtime.js', src: '/shared-runtime.js' },
        { name: 'product-main.js', src: '/product-main.js' }
      ]
    },
    {
      info: { type: 'section', name: 'featured-content' },
      assets: [
        { name: 'shared-runtime.js', src: '/shared-runtime.js' },
        {
          name: 'section-featured-content.js',
          src: '/section-featured-content.js'
        }
      ]
    },
    {
      info: { type: 'theme', name: 'cart' },
      assets: [
        { name: 'shared-runtime.js', src: '/shared-runtime.js' },
        { name: 'theme-cart.js', src: '/theme-cart.js' }
      ]
    }
  ]
}

const macro = test.macro<
  [{ templateDir: string; templateName: string }, string[]]
>({
  exec: async (t, { templateDir, templateName }, _expected) => {
    const manifest: Manifest = {
      ..._manifest,
      templateDir,
      templateName
    }

    const markup = `
    <script class="json-asset-manifest" type="application/json">
      ${JSON.stringify(manifest)}
    </script>
  `

    const url = 'http://localhost:3000'

    const { closeBrowserContext, window } = await loadBundleIntoJsdom<
      typeof Bundle
    >({
      markup,
      url,
      log: (...args) => {
        t.log(...args)
      },
      entrypoint: './devops/src/asset-loader/index.js'
    })

    t.teardown(closeBrowserContext)

    const { document, HTMLScriptElement } = window

    await sleep()

    const actual = [...document.querySelectorAll('script')].flatMap((el) => {
      return el instanceof HTMLScriptElement && el.src ? [el.src] : []
    })

    const expected = _expected.map((src) => new URL(src, url).href)

    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(macro, { templateDir: 'none', templateName: 'collection' }, [
  '/shared-runtime.js',
  '/collection-search.js',
  '/theme-cart.js'
])

test(macro, { templateDir: 'customers', templateName: 'account' }, [
  '/shared-runtime.js',
  '/shared-geolocation.js',
  '/customer-addresses.js',
  '/theme-cart.js'
])

test(macro, { templateDir: 'none', templateName: 'index' }, [
  '/shared-runtime.js',
  '/shared-swiper.js',
  '/home-hero.js',
  '/theme-cart.js'
])

test(macro, { templateDir: 'none', templateName: 'product' }, [
  '/shared-runtime.js',
  '/product-main.js',
  '/theme-cart.js'
])

test(
  'should load only site-wide resources',
  macro,
  { templateDir: 'none', templateName: 'article' },
  ['/shared-runtime.js', '/theme-cart.js']
)
