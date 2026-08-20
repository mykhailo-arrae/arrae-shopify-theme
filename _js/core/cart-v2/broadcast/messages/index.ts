import type { Message } from '../../../messaging/create-message-bus/message-shape.js'
import type { DiscountCode } from '../../blueprints/cart/discount-code.js'

// Cart event types
export type CartInitialized = Message<'cart:initialized', null>

export type CartCleared = Message<'cart:cleared', null>

export type ItemsAdded = Message<
  'cart:items:added',
  {
    items: {
      key: string
      quantity: number
    }[]
  }
>

export type ItemsRemoved = Message<
  'cart:items:removed',
  {
    items: {
      key: string
      title: string | null
    }[]
  }
>

export type ItemQuantityChanged = Message<
  'cart:items:quantity:changed',
  {
    items: {
      key: string
      quantity: number
    }[]
  }
>

export type ItemPropertiesChanged = Message<
  'cart:items:properties:changed',
  {
    items: {
      key: string
    }[]
  }
>

export type ItemSellingPlanChanged = Message<
  'cart:items:selling-plan:changed',
  {
    items: {
      key: string
    }[]
  }
>

export type DiscountsApplied = Message<
  'cart:discounts:applied',
  {
    discountCodes: DiscountCode[]
  }
>

export type DiscountsCleared = Message<'cart:discounts:cleared', null>

export type NoteAdded = Message<'cart:note:added', null>

export type AttributesAdded = Message<'cart:attributes:added', null>

export type CartError = Message<
  'cart:error',
  {
    error: Error
  }
>

// Union of all cart messages
export type AllCartMessages =
  | AttributesAdded
  | CartCleared
  | CartError
  | CartInitialized
  | DiscountsApplied
  | DiscountsCleared
  | ItemPropertiesChanged
  | ItemQuantityChanged
  | ItemSellingPlanChanged
  | ItemsAdded
  | ItemsRemoved
  | NoteAdded
