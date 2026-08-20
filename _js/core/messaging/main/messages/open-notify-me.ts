import type { Message } from '../../create-message-bus/message-shape.js'

export type OpenNotifyMe = Message<
  'request:open-notify-me',
  {
    productId: number
  }
>
