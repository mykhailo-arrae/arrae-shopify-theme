import { z } from 'zod'
import type { CartItem } from '../../../core/cart-v2/blueprints/cart/item.js'
import { Product } from '../../../core/shopify/schemas/product.js'

/** json-product.liquid rows are `{ product, metafields, variants }` — unwrap to a flat product for Zod. */
const unwrapRewardTierProductRow = (row: unknown): unknown => {
  if (row !== null && typeof row === 'object' && 'product' in row) {
    const inner = Reflect.get(row, 'product')
    return inner ?? row
  }
  return row
}

const rewardTierProductsSchema = z.preprocess(
  (val) => (Array.isArray(val) ? val : []).map(unwrapRewardTierProductRow),
  Product.array()
)

export const CartProductVariantSchema = z.object({
  id: z.number(),
  title: z.string(),
  price: z.number(),
  has_selling_plan: z.boolean(),
  selling_plan_id: z.number().nullable().optional(),
  selling_plan_discount_percent: z.number().nullable().optional()
})

export type CartProductVariant = z.infer<typeof CartProductVariantSchema>

/** Variants for a cart line product (from `react-cart` Liquid). */
export const CartProductVariantsSchema = z.object({
  product_id: z.number(),
  product_title: z.string().optional().default(''),
  option_value_prefix: z.string().optional().default(''),
  card_image_url: z.string().nullable().optional(),
  marketing_copy: z.string().nullable().optional(),
  has_subscription_plans: z.boolean().default(false),
  variants: z.preprocess(
    (val) => (val == null ? [] : val),
    z.array(CartProductVariantSchema)
  )
})

export type CartProductVariants = z.infer<typeof CartProductVariantsSchema>

export const UpsellCollectionProductSchema = z.object({
  handle: z.string(),
  tags: z.array(z.string()).default([]),
  available: z.boolean().optional().default(true),
  variants: z
    .array(
      z.object({
        available: z.boolean().optional(),
        variant: z.object({ available: z.boolean().optional() }).optional()
      })
    )
    .optional()
})

export const CartLayoutSchema = z.union([
  z.literal('page'),
  z.literal('drawer')
])

export const CartDataSchema = z.object({
  layout: CartLayoutSchema,
  section_id: z.string().optional().nullable(),
  continue_shopping_link: z.string().optional().nullable(),
  market: z
    .object({
      name: z.string().nullable(),
      iso_code: z.string().nullable(),
      money_format: z.string(),
      currency_symbol: z.string()
    })
    .optional(),
  promo_bar: z
    .object({
      enabled: z.boolean(),
      text: z.string().nullable()
    })
    .optional()
    .nullable(),
  empty_cart: z.object({
    title: z.string().nullable(),
    cta_primary_link: z.string().nullable(),
    cta_primary_text: z.string().nullable()
  }),
  upsell: z.object({
    source: z.union([z.literal('theme'), z.literal('rebuy')]),
    enabled: z.boolean(),
    title: z.string().nullable(),
    collection_products: z.preprocess(
      (val) => (val == null || val === '' ? null : val),
      z.array(UpsellCollectionProductSchema).nullable()
    ),
    max_quantity: z.number(),
    tags_to_ignore: z.string().optional().nullable(),
    rebuy_upsell_section_id: z.string().optional().nullable()
  }),
  rewards: z.object({
    enabled: z.boolean(),
    title: z.string().optional().nullable(),
    include_discounts_in_rewards: z.boolean(),
    enable_auto_gwp: z.boolean().default(true),
    all_tiers_met_text: z.string().optional().nullable(),
    items: z.array(
      z.object({
        handle: z.string(),
        id: z.number().int().optional(),
        title: z.string().optional().nullable(),
        enabled: z.boolean(),
        minimum_value: z
          .union([z.number(), z.string()])
          .transform((v) => (typeof v === 'string' ? Number(v) : v)),
        text_before_reward_met: z.string().optional().nullable(),
        text_after_reward_met: z.string().optional().nullable(),
        products: rewardTierProductsSchema
      })
    )
  }),
  enable_discount_code_input: z.boolean(),
  cart_product_variants: z
    .preprocess(
      (val) => (val == null || val === '' ? [] : val),
      z.array(CartProductVariantsSchema)
    )
    .optional()
    .nullable()
})

export type CartDataProps = {
  data: CartData
}

export type CartRewardItem = CartData['rewards']['items'][number]

export type LineItemProps = {
  data: {
    item: CartItem
    handle: string
    money_format: string
    productVariants: CartProductVariants | null
  }
}

export type QuantityProps = {
  data: {
    item: CartItem
  }
}

export type CartData = z.infer<typeof CartDataSchema>
