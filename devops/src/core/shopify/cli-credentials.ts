import { z } from 'devops-zod4'

const AccessToken = z.string().min(1)
const Shop = z.string().min(1).endsWith('.myshopify.com')
const ShopHandle = z.string().min(1)

export const ShopifyCliCredentials = z
  .object({
    // Shopify CLI env vars
    SHOPIFY_FLAG_STORE: z.string().optional(),
    SHOPIFY_CLI_THEME_TOKEN: z.string().optional(),
    // ThemeKit env vars
    SHOPIFY_SHOP: z.string().optional(),
    SHOPIFY_CLI_ADMIN_AUTH_TOKEN: z.string().optional(),
    // Internal naming (CI)
    // Uses SHOPIFY_SHOP
    SHOPIFY_ADMIN_API_TOKEN: z.string().optional()
  })
  .transform(
    ({
      SHOPIFY_ADMIN_API_TOKEN,
      SHOPIFY_CLI_ADMIN_AUTH_TOKEN,
      SHOPIFY_CLI_THEME_TOKEN,
      SHOPIFY_FLAG_STORE,
      SHOPIFY_SHOP
    }) => {
      const mode: 'shopify-cli' | 'themekit' = SHOPIFY_FLAG_STORE
        ? 'shopify-cli'
        : 'themekit'

      const shop = mode === 'shopify-cli' ? SHOPIFY_FLAG_STORE : SHOPIFY_SHOP
      const accessToken =
        mode === 'shopify-cli'
          ? SHOPIFY_CLI_THEME_TOKEN
          : SHOPIFY_CLI_ADMIN_AUTH_TOKEN || SHOPIFY_ADMIN_API_TOKEN

      return {
        accessToken,
        shop
      }
    }
  )
  .pipe(
    z.object({
      accessToken: AccessToken,
      shop: Shop
    })
  )
  .transform(({ accessToken, shop }) => {
    return {
      accessToken,
      shop,
      shopHandle: shop.replace('.myshopify.com', '').trim()
    }
  })
  .pipe(
    z.object({
      accessToken: AccessToken,
      shop: Shop,
      shopHandle: ShopHandle
    })
  )

export type ShopifyCliCredentialsInput = z.input<typeof ShopifyCliCredentials>
export type ShopifyCliCredentials = z.infer<typeof ShopifyCliCredentials>
