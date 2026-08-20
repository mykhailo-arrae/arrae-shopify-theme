import { z } from 'zod'

export const DiscountCode = z.object({
  code: z.string(),
  amount: z.number().optional(),
  type: z.string().optional(),
  applicable: z.boolean().optional()
})

export type DiscountCode = z.infer<typeof DiscountCode>
