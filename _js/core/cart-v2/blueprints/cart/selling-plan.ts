import { z } from 'zod'

export const PriceAdjustment = z.object({
  position: z.number(),
  price: z.number()
})

export type PriceAdjustment = z.infer<typeof PriceAdjustment>

export const SellingPlanOption = z.object({
  name: z.string(),
  position: z.number(),
  value: z.string()
})

export type SellingPlanOption = z.infer<typeof SellingPlanOption>

export const SellingPlanPriceAdjustment = z.object({
  order_count: z.number().nullable(),
  position: z.number(),
  value_type: z.string(),
  value: z.number()
})

export type SellingPlanPriceAdjustment = z.infer<
  typeof SellingPlanPriceAdjustment
>

export const SellingPlan = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  options: z.array(SellingPlanOption),
  recurring_deliveries: z.boolean(),
  fixed_selling_plan: z.boolean().nullable().optional(),
  price_adjustments: z.array(SellingPlanPriceAdjustment)
})

export type SellingPlan = z.infer<typeof SellingPlan>

export const SellingPlanAllocation = z.object({
  price_adjustments: z.array(PriceAdjustment),
  price: z.number(),
  compare_at_price: z.number(),
  per_delivery_price: z.number(),
  selling_plan: SellingPlan
})

export type SellingPlanAllocation = z.infer<typeof SellingPlanAllocation>
