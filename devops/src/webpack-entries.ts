import type { EntryObject } from '@rspack/core'

/**
 * Please use portable sections as much as possible.
 *
 * Manual entrypoint names must start with a template type,
 * e.g., `product-main` for product page bundle or `theme-general` for a bundle that should load on every page
 *
 * Allowed prefixes: `collection`, `customer`, `home`, `product`, `theme`.
 *
 * @example
 * const entry = {
 *   'product-main': './_js-dist/product/index.js',
 * }
 **/
export const entry = {
  'product-main': './_js-dist/product/index.js',
  'theme-cart': './_js-dist/cart/index.js',
  'theme-general': './_js-dist/theme/index.js'
} as const satisfies EntryObject
