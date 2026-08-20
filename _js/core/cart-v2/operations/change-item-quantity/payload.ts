import { z } from 'zod'

// Payload schemas
export const ChangeQuantityItem = z.object({
  lineItemKey: z.string().min(1),
  quantity: z.number().int().min(0)
})

export type ChangeQuantityItem = z.infer<typeof ChangeQuantityItem>

export const ChangeQuantityPayload = z.object({
  items: z.array(ChangeQuantityItem).min(1)
})

export type ChangeQuantityPayload = z.infer<typeof ChangeQuantityPayload>
