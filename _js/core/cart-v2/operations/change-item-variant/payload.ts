import { z } from 'zod'

export const ChangeVariantItem = z.object({
  lineItemKey: z.string().min(1),
  variantId: z.number().int().positive(),
  sellingPlan: z.number().int().positive().nullable(),
  quantity: z.number().int().min(1).optional(),
  properties: z.record(z.string(), z.unknown()).optional()
})
export type ChangeVariantItem = z.infer<typeof ChangeVariantItem>

export const ChangeVariantPayload = z.object({
  items: z.array(ChangeVariantItem).min(1)
})
export type ChangeVariantPayload = z.infer<typeof ChangeVariantPayload>
