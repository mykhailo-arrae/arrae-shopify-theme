import type { Message } from '../../create-message-bus/message-shape.js'

export type Details = null

export type CoreCartUpdate = Message<'core:cart:update', Details>
