import { z } from 'zod'

export const CartItemProperties = z.record(
  z.string(),
  z
    .union([
      z.boolean(),
      z.number(),
      z.string(),
      z
        .array(
          z.union([z.boolean(), z.number(), z.string()]).nullable().optional()
        )
        .optional()
    ])
    .nullable()
)

export type CartItemProperties = z.infer<typeof CartItemProperties>
