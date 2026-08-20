import { z } from 'zod'
import { Product } from '../../shopify/schemas/product.js'
import { ProductVariant } from '../../shopify/schemas/product-variant.js'

export const SellingPlanAllocationSchema = z.object({
  selling_plan_id: z.number().optional(),
  selling_plan_group_id: z.string().optional(),
  selling_plan_name: z.string().optional(),
  compare_at_price: z.number().nullable(),
  price: z.number().optional(),
  price_adjustments: z
    .array(
      z.object({
        price: z.number().optional(),
        compare_at_price: z.number().nullable().optional(),
        per_delivery_price: z.number().optional(),
        unit_price: z.number().optional()
      })
    )
    .optional(),
  selling_plan: z
    .object({
      id: z.number().optional(),
      name: z.string().optional()
    })
    .optional()
})

export const JSONMediaPresentationSchema = z.object({
  focalPoint: z
    .object({
      x: z.string().nullable(),
      y: z.string().nullable()
    })
    .nullable()
    .optional()
})

export const OptionValueSchema = z.object({
  available: z.boolean().nullable(),
  id: z.number().nullable(),
  name: z.string().nullable(),
  product_url: z.string().nullable(),
  selected: z.boolean().nullable(),
  variant: ProductVariant.nullable()
})

export const OptionWithValueSchema = z.object({
  name: z.string().nullable(),
  position: z.number().nullable(),
  selected_value: z.string().nullable(),
  values: z.array(OptionValueSchema).nullable()
})

export const OptionsWithValuesSchema = z.array(OptionWithValueSchema)

export const JSONVariantSchema = z.object({
  variant: ProductVariant
})

export const JSONProductMetafieldSchema = z.object({
  has_only_default_variant: z.boolean(),
  selected_or_first_available_variant: ProductVariant.nullable(),
  product_card_marketing_copy: z.string().nullable().optional(),
  options_with_values: OptionsWithValuesSchema.nullable()
})

// If you need to reference IJsonProduct inside IJsonProduct
// make sure to use the lazy version of the schema
// otherwise it will cause a stack overflow
// https://github.com/colinhacks/zod/issues/1500#issuecomment-2324304993
export const JSONProductSchema = z.lazy(() =>
  z.object({
    product: Product,
    variants: z.array(JSONVariantSchema),
    metafields: JSONProductMetafieldSchema
  })
)

export type IJsonProduct = z.infer<typeof JSONProductSchema>

export const JSONRewardSchema = z.object({
  enabled: z.boolean(),
  minimum_value: z.array(
    z.object({
      market: z.string(),
      value: z.string()
    })
  ),
  text_before_reward_met: z.string().optional().nullable(),
  text_after_reward_met: z.string().optional().nullable()
})

export const JSONRewardGroupSchema = z.object({
  items: z.array(JSONRewardSchema)
})

export const JSONSellingPlanAllocationSchema =
  SellingPlanAllocationSchema.extend({
    subscription_price_html: z.string().nullable().optional()
  })

export const RecommendationsApiResponseProductSchema = z.object({
  handle: z.string(),
  tags: z.array(z.string()),
  available: z.boolean().optional().default(true)
})

export const RecommendationsApiResponseSchema = z.object({
  products: z.array(RecommendationsApiResponseProductSchema),
  intent: z.string().nullable()
})
