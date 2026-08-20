import { z } from 'zod'

const ShopifyIdInput = z.union([z.string().min(1), z.number().int().positive()])
export type ShopifyIdInput = z.infer<typeof ShopifyIdInput>

const ShopifyIdOutput = z.discriminatedUnion('type', [
  z.object({ type: z.literal('GlobalId'), value: z.string().min(1) }),
  z.object({
    type: z.literal('LegacyId'),
    value: z.string().min(1),
    originalValue: ShopifyIdInput
  })
])
export type ShopifyIdOutput = z.infer<typeof ShopifyIdOutput>

/**
 * Standardizes Shopify ID input.
 *
 * Shopify IDs can be either legacy IDs (numbers or number strings) or global IDs (gid://...) in certain contexts.
 *
 * @returns The ID value as a string, with the type annotation and the original value if it was a legacy ID.
 */
export const ShopifyId = ShopifyIdInput.transform<ShopifyIdOutput>((input) => {
  if (typeof input === 'number') {
    return { type: 'LegacyId', value: input.toString(), originalValue: input }
  }

  input satisfies string

  if (input.startsWith('gid://')) {
    return {
      type: 'GlobalId',
      value: input
    }
  }

  return {
    type: 'LegacyId',
    value: input,
    originalValue: input
  }
}).pipe(ShopifyIdOutput)
export type ShopifyId = z.infer<typeof ShopifyId>
