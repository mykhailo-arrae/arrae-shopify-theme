import { makeUseMessageBus } from '../create-message-bus/react.js'
import { initMainBus } from './index.js'

const mainBus = initMainBus()

export const useMainBus = makeUseMessageBus(mainBus)
