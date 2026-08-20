import { z } from 'zod'

/**
 * A permissive float parsing schema that accepts both strings and numbers.
 */
export const Float = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : value

    if (Number.isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected an float, received nan'
      })
    }

    return parsed
  })
  .pipe(z.number())

export type Float = z.infer<typeof Float>
