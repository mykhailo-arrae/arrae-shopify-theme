import { z } from 'devops-zod4'

/**
 * A permissive integer parsing schema that accepts both strings and numbers.
 */
export const Integer = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : value

    if (Number.isNaN(parsed)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Expected an integer, received nan'
      })
    }

    return parsed
  })
  .pipe(z.number().int())

export type Integer = z.infer<typeof Integer>
