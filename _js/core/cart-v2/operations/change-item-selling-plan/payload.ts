import { z } from 'zod'

export const ChangeSellingPlanItem = z.object({
  lineItemKey: z.string().min(1),
  quantity: z.number().min(1).optional().nullable(),
  sellingPlan: z.number().int().positive().nullable()
})
export type ChangeSellingPlanItem = z.infer<typeof ChangeSellingPlanItem>

export const ChangeSellingPlanPayload = z.object({
  items: z.array(ChangeSellingPlanItem).min(1)
})
export type ChangeSellingPlanPayload = z.infer<typeof ChangeSellingPlanPayload>
