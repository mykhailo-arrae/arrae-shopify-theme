import { z } from 'zod'

export const ApplyDiscountsPayload = z.object({
  add: z.array(z.string()).default([]),
  remove: z.array(z.string()).default([])
})

export type ApplyDiscountsPayload = z.infer<typeof ApplyDiscountsPayload>
