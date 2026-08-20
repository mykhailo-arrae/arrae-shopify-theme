import { z } from 'zod'
import { Integer } from '../../../zod/integer.js'

// Payload schemas
export const SingleItemPayload = z.object({
  id: Integer.pipe(z.number().min(1)),
  quantity: Integer.pipe(z.number().min(1)),
  properties: z.record(z.string(), z.unknown()).optional(),
  selling_plan: Integer.pipe(z.number().min(1)).nullable().optional()
})

export type SingleItemPayload = z.infer<typeof SingleItemPayload>

export const AddItemsPayload = z.object({
  items: z.array(SingleItemPayload).min(1)
})

export type AddItemsPayload = z.infer<typeof AddItemsPayload>
