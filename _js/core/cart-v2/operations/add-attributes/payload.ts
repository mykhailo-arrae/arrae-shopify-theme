import { z } from 'zod'
import { CartAttributes } from '../../blueprints/cart/index.js'

export const AddAttributesPayload = z.object({
  attributes: CartAttributes
})

export type AddAttributesPayload = z.infer<typeof AddAttributesPayload>
