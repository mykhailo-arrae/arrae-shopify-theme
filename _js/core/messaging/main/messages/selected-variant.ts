import type {
  Product,
  SellingPlanId
} from '../../../shopify/schemas/product.js'
import type { ProductVariant } from '../../../shopify/schemas/product-variant.js'
import type { Message } from '../../create-message-bus/message-shape.js'

export type Details = {
  product: Product
  selectedVariant: ProductVariant | null
  sellingPlanId: SellingPlanId | null
  sellingPlanAfterPrice: number | null
  displayPrice?: number
  compareAtPrice?: number | null
}

export type SelectedVariant = Message<'notification:selected-variant', Details>
