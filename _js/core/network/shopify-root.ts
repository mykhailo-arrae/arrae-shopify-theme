import { z } from 'zod'

const WindowShopifyRoot = z.object({
  Shopify: z.object({
    routes: z.object({
      root: z.string().min(1)
    })
  })
})

/**
 * Returns the Shopify root URL path for the current store.
 *
 * In a Shopify theme, assets and URLs are served from a CDN with a specific
 * root path. This function safely extracts this root path from the Shopify
 * global object to ensure all URLs are constructed correctly.
 *
 * If the Shopify.routes.root property is not available, defaults to '/'.
 *
 * @returns The root path for the current Shopify store (e.g., '/pages/' or '/')
 */
export const getShopifyRoot = (): string => {
  const result = WindowShopifyRoot.safeParse(window)

  if (result.success === false) {
    return '/'
  }

  return result.data.Shopify.routes.root
}

export type AtShopifyRoot = (path: string) => URL

/**
 * Constructs a full URL by appending a path to the Shopify root path.
 *
 * This ensures that all generated URLs properly respect the Shopify store's
 * root path configuration, which is important when building links to other
 * pages or resources within the theme.
 *
 * @param path - The path to append to the Shopify root
 * @returns A complete URL object with the proper Shopify root path included
 *
 * @example
 * // With default Shopify root ('/')
 * atShopifyRoot('cart/update.js').toString()
 * // => 'https://example.com/cart/update.js'
 *
 * @example
 * // With a leading slash in the path
 * atShopifyRoot('/cart/update.js').toString()
 * // => 'https://example.com/cart/update.js'
 *
 * @example
 * // With regional Shopify root ('/en-pl/')
 * // When Shopify.routes.root is '/en-pl/'
 * atShopifyRoot('cart/update.js').toString()
 * // => 'https://example.com/en-pl/cart/update.js'
 */
export const atShopifyRoot: AtShopifyRoot = (_path) => {
  const path = _path.startsWith('/') ? _path.slice(1) : _path

  const Url = new URL([getShopifyRoot(), path].join(''), window.location.origin)

  return Url
}
