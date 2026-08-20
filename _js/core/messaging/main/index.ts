import { once } from '../../function/once.js'
import { makeMessageBus } from '../create-message-bus/index.js'
import type { AddedItemToCart } from './messages/added-item-to-cart.js'
import type { CoreCartUpdate } from './messages/cart-update.js'
import type { OpenCartDrawer } from './messages/open-cart-drawer.js'
import type { OpenNotifyMe } from './messages/open-notify-me.js'
import type { OpenQuickshopDrawer } from './messages/open-quickshop-drawer.js'
import type { RequestCartRefresh } from './messages/refresh-cart.js'
import type { SelectedVariant } from './messages/selected-variant.js'

export type MainBusMessage =
  | AddedItemToCart
  | OpenCartDrawer
  | OpenQuickshopDrawer
  | OpenNotifyMe
  | SelectedVariant
  | CoreCartUpdate
  | RequestCartRefresh

export const initMainBus = once(() => {
  return makeMessageBus<MainBusMessage>()
})
