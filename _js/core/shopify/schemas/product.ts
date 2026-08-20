import { z } from 'zod'
import { ProductVariant } from './product-variant.js'

export const Media = z.object({
  id: z.number(),
  position: z.number(),
  media_type: z.string()
})

export type Media = z.infer<typeof Media>

export const SellingPlanId = z.number()
export type SellingPlanId = z.infer<typeof SellingPlanId>

export const SellingPlanOption = z.object({
  name: z.string(),
  value: z.string()
})

export const SellingPlanPriceAdjustmentsValueType = z.enum([
  'percentage',
  'fixed_amount',
  'price'
])

export const SellingPlanPriceAdjustment = z.object({
  order_count: z.number().optional().nullable(),
  position: z.number().optional().nullable(),
  value: z.number().optional().nullable(),
  value_type: SellingPlanPriceAdjustmentsValueType.optional().nullable()
})

export const SellingPlan = z.object({
  id: SellingPlanId,
  name: z.string(),
  selected: z.boolean().nullable().optional(),
  options: z.array(SellingPlanOption),
  price_adjustments: z.array(SellingPlanPriceAdjustment).nullable().optional()
})
export type SellingPlan = z.infer<typeof SellingPlan>

export const SellingPlanGroup = z.object({
  id: z.string(),
  name: z.string(),
  app_id: z.string().nullable().optional(),
  selling_plan_selected: z.boolean().optional(),
  selling_plans: z.array(SellingPlan)
})

export type SellingPlanGroup = z.infer<typeof SellingPlanGroup>

export const SellingPlansGroup = z.array(SellingPlanGroup)

export type SellingPlansGroup = z.infer<typeof SellingPlansGroup>

export const Product = z.object({
  id: z.number(),
  title: z.string(),
  handle: z.string(),
  description: z.string().nullable(),
  published_at: z.string().nullable(),
  created_at: z.string(),
  vendor: z.string(),
  type: z.string(),
  tags: z.array(z.string()),
  price: z.number(),
  price_min: z.number(),
  price_max: z.number(),
  available: z.boolean(),
  price_varies: z.boolean(),
  compare_at_price: z.number().nullable(),
  compare_at_price_min: z.number().nullable(),
  compare_at_price_max: z.number().nullable(),
  compare_at_price_varies: z.boolean(),
  variants: z.array(ProductVariant).nonempty(),
  requires_selling_plan: z.boolean(),
  selected_selling_plan: SellingPlan.nullable().optional(),
  selling_plan_groups: z.array(SellingPlanGroup).nullable().optional(),
  images: z.array(z.string()),
  options: z.array(z.string()).nonempty(),
  media: z.array(Media).optional(),
  content: z.string().nullable()
})

export type Product = z.infer<typeof Product>
