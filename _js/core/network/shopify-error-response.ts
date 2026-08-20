import { z } from 'zod'
import { Integer } from '../zod/integer.js'

export const ShopifyErrorResponse = z.object({
  status: z
    .union([z.nan(), z.string(), z.number()])
    .nullable()
    .optional()
    .transform((s) => {
      if (s == null) {
        return null
      }

      if (typeof s === 'string') {
        return s ? s : null
      }

      if (Number.isNaN(s)) {
        return null
      }

      return s
    })
    .pipe(Integer.nullable()),
  message: z.string().min(1, { message: 'Message should not be empty' }),
  description: z
    .string()
    .nullable()
    .optional()
    .transform((d) => {
      return d ? d : null
    })
    .pipe(z.string().min(1).nullable())
})
export type ShopifyErrorResponse = z.infer<typeof ShopifyErrorResponse>

export const BrandedShopifyErrorResponse = ShopifyErrorResponse.extend({
  __typename: z.literal('ShopifyErrorResponse')
})
export type BrandedShopifyErrorResponse = z.infer<
  typeof BrandedShopifyErrorResponse
>

export const parseShopifyErrorResponse = (
  json: unknown
): BrandedShopifyErrorResponse => {
  const result = ShopifyErrorResponse.safeParse(json)

  if (result.success === false) {
    const firstIssue = result.error.issues[0]

    if (firstIssue == null) {
      return {
        __typename: 'ShopifyErrorResponse',
        status: 500,
        message: result.error.message,
        description: null
      }
    }

    const description = [
      firstIssue.path.length === 0
        ? null
        : `Property "${firstIssue.path.join('.')}" -`,
      firstIssue.message
    ]
      .filter((line) => line)
      .join(' ')

    return {
      __typename: 'ShopifyErrorResponse',
      message: 'Malformed API response',
      status: 500,
      description
    }
  }

  return {
    ...result.data,
    __typename: 'ShopifyErrorResponse'
  }
}
