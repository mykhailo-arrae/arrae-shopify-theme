import type { Message } from '../../create-message-bus/message-shape.js'

type Item = {
  key: string
  title: string | null
}

export type Details = {
  items: Item[]
}

export type AddedItemToCart = Message<'notification:added-item-to-cart', null>
