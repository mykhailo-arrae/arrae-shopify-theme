import { z } from 'zod'
import { DiscountCode } from './discount-code.js'
import { CartItem } from './item.js'

export const CartAttributes = z.record(
  z.string(),
  z
    .union([
      z.number(),
      z.string(),
      z.array(z.union([z.number(), z.string()]).nullable())
    ])
    .nullable()
)

export type CartAttributes = z.infer<typeof CartAttributes>

export const CartLevelDiscountApplication = z.object({
  key: z.string().nullable(),
  title: z.string().nullable(),
  total_allocated_amount: z.number().nullable()
})

export type CartLevelDiscountApplication = z.infer<
  typeof CartLevelDiscountApplication
>

export const Cart = z.object({
  token: z.string(),
  note: z.string().nullable(),
  attributes: CartAttributes,
  original_total_price: z.number(),
  total_price: z.number(),
  total_discount: z.number(),
  total_weight: z.number(),
  item_count: z.number(),
  items: z.array(CartItem),
  requires_shipping: z.boolean(),
  currency: z.string(),
  items_subtotal_price: z.number(),
  cart_level_discount_applications: z.array(CartLevelDiscountApplication),
  discount_codes: z.array(DiscountCode)
})

export type Cart = z.infer<typeof Cart>
