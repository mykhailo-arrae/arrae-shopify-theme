import { z } from 'zod'
import { CartItemProperties } from './item-properties.js'
import { QuantityRule } from './quantity-rule.js'
import { SellingPlanAllocation } from './selling-plan.js'

export const CartItemDiscount = z.object({
  amount: z.number(),
  title: z.string(),
  applicable: z.boolean().nullable().optional(),
  description: z.string().nullable().optional(),
  non_applicable_reason: z.string().nullable().optional(),
  value_type: z.string().nullable().optional()
})

export type CartItemDiscount = z.infer<typeof CartItemDiscount>

export const CartItemFeaturedImage = z.object({
  url: z.string().nullable(),
  alt: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  aspect_ratio: z.number().nullable()
})

export type CartItemFeaturedImage = z.infer<typeof CartItemFeaturedImage>

export const OptionWithValue = z.object({
  name: z.string(),
  value: z.string()
})

export type OptionWithValue = z.infer<typeof OptionWithValue>

export const LineLevelDiscountAllocation = z.object({
  amount: z.number(),
  discount_application: z.object({
    key: z.string().nullable(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    value: z.string().nullable(),
    value_type: z.string(),
    allocation_method: z.string(),
    target_selection: z.string(),
    target_type: z.string(),
    created_at: z.string()
  })
})

export type LineLevelDiscountAllocation = z.infer<
  typeof LineLevelDiscountAllocation
>

export const CartItem = z.object({
  key: z.string().min(1),
  id: z.number(),
  properties: z.nullable(CartItemProperties),
  quantity: z.number(),
  variant_id: z.number(),
  title: z.string().nullable(),
  price: z.number(),
  original_price: z.number(),
  presentment_price: z.number(),
  discounted_price: z.number(),
  line_price: z.number(),
  original_line_price: z.number(),
  total_discount: z.number(),
  discounts: z.array(CartItemDiscount),
  sku: z.string().nullable(),
  grams: z.number(),
  vendor: z.string().nullable(),
  taxable: z.boolean().nullable(),
  product_id: z.number().nullable(),
  product_has_only_default_variant: z.boolean(),
  gift_card: z.boolean(),
  final_price: z.number(),
  final_line_price: z.number(),
  url: z.string(),
  featured_image: CartItemFeaturedImage,
  image: z.string().nullable(),
  handle: z.string().nullable(),
  requires_shipping: z.boolean().nullable(),
  product_type: z.string().nullable(),
  product_title: z.string().nullable(),
  product_description: z.string().nullable(),
  variant_title: z.string().nullable(),
  variant_options: z.array(z.string()).nullable(),
  options_with_values: z.array(OptionWithValue).nullable(),
  line_level_discount_allocations: z.array(LineLevelDiscountAllocation),
  line_level_total_discount: z.number(),
  quantity_rule: QuantityRule.nullable().optional(),
  has_components: z.boolean().nullable().optional(),
  selling_plan_allocation: SellingPlanAllocation.optional()
})

export type CartItem = z.infer<typeof CartItem>
