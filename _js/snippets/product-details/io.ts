import { type Infer, size, string, type } from 'superstruct'

export const ProductDetailsIO = type({
  currencyCode: size(string(), 3, 3),
  moneyFormat: string()
})

export type ProductDetailsIO = Infer<typeof ProductDetailsIO>
