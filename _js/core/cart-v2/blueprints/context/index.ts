import { z } from 'zod'
import { Cart } from '../cart/index.js'
import { OperationResult } from './operation-result.js'
import { Warning } from './warning.js'

export const CartError = z.object({
  actorId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  errorType: z.enum([
    'CartUserError',
    'CartImplementationError',
    'CartCommunicationError'
  ]),
  message: z.string().min(1)
})
export type CartError = z.infer<typeof CartError>

export const NoCartContext = z.object({
  __type: z.literal('NoCart'),
  cart: z.null(),
  latestOperations: z.array(OperationResult),
  warnings: z.array(Warning)
})
export type NoCartContext = z.infer<typeof NoCartContext>

export const CartErrorContext = z.object({
  __type: z.literal('CartError'),
  cart: Cart.nullable(),
  error: CartError,
  latestOperations: z.array(OperationResult),
  warnings: z.array(Warning)
})
export type CartErrorContext = z.infer<typeof CartErrorContext>

export const CartContext = z.object({
  __type: z.literal('Cart'),
  cart: Cart,
  latestOperations: z.array(OperationResult),
  warnings: z.array(Warning)
})
export type CartContext = z.infer<typeof CartContext>

export const Context = z.discriminatedUnion('__type', [
  NoCartContext,
  CartErrorContext,
  CartContext
])
export type Context = z.infer<typeof Context>
