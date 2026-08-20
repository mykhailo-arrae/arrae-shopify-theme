import { z } from 'zod'

export const QuantityRule = z.object({
  min: z.number(),
  max: z.number().nullable(),
  increment: z.number()
})

export type QuantityRule = z.infer<typeof QuantityRule>
