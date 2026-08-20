import type { Message } from '../../create-message-bus/message-shape.js'

export type RequestCartRefresh = Message<'request:cart:refresh', null>
