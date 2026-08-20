import { z } from 'zod'

export const FeaturedVariantImage = z.object({
  id: z.number(),
  position: z.number(),
  alt: z.string().nullable(),
  width: z.number(),
  height: z.number(),
  src: z.string(),
  variant_ids: z.array(z.number())
})

export type FeaturedVariantImage = z.infer<typeof FeaturedVariantImage>

export const FeaturedVariantMedia = z.object({
  id: z.number()
})

export type FeaturedVariantMedia = z.infer<typeof FeaturedVariantMedia>

export const SellingPlanAllocation = z.object({
  selling_plan_group_id: z.string().optional(),
  price: z.number().optional(),
  compare_at_price: z.number().nullable().optional(),
  per_delivery_price: z.number().optional(),
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
      id: z.number(),
      name: z.string().optional()
    })
    .optional()
})

export type SellingPlanAllocation = z.infer<typeof SellingPlanAllocation>

export const ProductVariant = z.object({
  id: z.number(),
  title: z.string(),
  option1: z.string(),
  option2: z.string().nullable(),
  option3: z.string().nullable(),
  options: z.array(z.string()).nonempty(),
  sku: z.string().nullable(),
  requires_shipping: z.boolean(),
  taxable: z.boolean(),
  available: z.boolean(),
  name: z.string(),
  public_title: z.string().nullable(),
  price: z.number(),
  compare_at_price: z.number().nullable(),
  weight: z.number(),
  barcode: z.string().nullable(),
  featured_image: FeaturedVariantImage.nullable(),
  featured_media: FeaturedVariantMedia.nullable().optional(),
  selling_plan_allocations: z
    .array(SellingPlanAllocation)
    .optional()
    .default([])
})

export type ProductVariant = z.infer<typeof ProductVariant>
