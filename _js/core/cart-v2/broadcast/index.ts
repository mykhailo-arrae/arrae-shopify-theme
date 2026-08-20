import {
  type MessageBus,
  makeMessageBus
} from '../../messaging/create-message-bus/index.js'
import type { AllCartMessages } from './messages/index.js'

export const cartMessageBus: MessageBus<AllCartMessages> = makeMessageBus()
