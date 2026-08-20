import { z } from 'zod'
import { Timestamp } from './timestamp.js'

// TODO Add title, maybe remove product_id and variant_id
const MinimalCartItem = z.object({
  key: z.string().min(1),
  title: z.string().min(1).nullable().optional()
})

export const OperationResult = z.discriminatedUnion('__type', [
  z.object({
    __type: z.literal('initialized'),
    timestamp: Timestamp
  }),
  z.object({
    __type: z.literal('addedItems'),
    timestamp: Timestamp,
    items: z.array(MinimalCartItem)
  }),
  z.object({
    __type: z.literal('addedNote'),
    timestamp: Timestamp
  }),
  z.object({
    __type: z.literal('changedItems'),
    timestamp: Timestamp,
    // TODO Use epic's input because API returns the full cart payload
    items: z.array(MinimalCartItem)
  }),
  z.object({
    __type: z.literal('removedItems'),
    timestamp: Timestamp,
    // TODO Use epic's input because API returns the full cart payload
    items: z.array(MinimalCartItem)
  }),
  z.object({
    __type: z.literal('appliedDiscounts'),
    timestamp: Timestamp,
    add: z.array(z.string()),
    remove: z.array(z.string())
  }),
  z.object({
    __type: z.literal('clearedDiscounts'),
    timestamp: Timestamp
  }),
  z.object({
    __type: z.literal('clearedCart'),
    timestamp: Timestamp
  }),
  z.object({
    __type: z.literal('addedAttributes'),
    timestamp: Timestamp
  })
])

export type OperationResult = z.infer<typeof OperationResult>
