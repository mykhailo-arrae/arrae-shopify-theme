import { z } from 'zod'

export const State = z.enum([
  'Idle',
  'Initializing',
  'Ready',
  'AddingItems',
  'AddingNote',
  'AddingAttributes',
  'ChangingItems',
  'RemovingItems',
  'ApplyingDiscounts',
  'ClearingDiscounts',
  'ClearingCart',
  'RefreshingCart'
])
export type State = z.infer<typeof State>

export const Tag = z.enum(['ready', 'busy'])
export type Tag = z.infer<typeof Tag>
