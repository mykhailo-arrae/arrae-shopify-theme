import { z } from 'zod'
import { CartItemProperties } from '../../blueprints/cart/item-properties.js'

// Payload schemas
export const ChangePropertiesItem = z.object({
  lineItemKey: z.string().min(1),
  properties: CartItemProperties
})

export type ChangePropertiesItem = z.infer<typeof ChangePropertiesItem>

export const ChangePropertiesPayload = z.object({
  items: z.array(ChangePropertiesItem).min(1)
})

export type ChangePropertiesPayload = z.infer<typeof ChangePropertiesPayload>
