import { z } from 'zod'

export const RemoveItemsPayload = z.object({
  lineItemKeys: z.array(z.string().min(1)).min(1)
})
export type RemoveItemsPayload = z.infer<typeof RemoveItemsPayload>
