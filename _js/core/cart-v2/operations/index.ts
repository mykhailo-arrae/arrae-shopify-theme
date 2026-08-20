import { getCurrentTimestamp } from '../blueprints/context/timestamp.js'
import { cartMessageBus } from '../broadcast/index.js'
import type { AllCartMessages } from '../broadcast/messages/index.js'
import { addAttributes } from './add-attributes/index.js'
import { addItems } from './add-items/index.js'
import { addNote } from './add-note/index.js'
import { applyDiscounts } from './apply-discounts/index.js'
import { changeItemProperties } from './change-item-properties/index.js'
import { changeItemQuantity } from './change-item-quantity/index.js'
import { changeItemSellingPlan } from './change-item-selling-plan/index.js'
import { changeItemVariant } from './change-item-variant/index.js'
import { clearCart } from './clear-cart/index.js'
import { clearDiscounts } from './clear-discounts/index.js'
import { fetchCart } from './fetch-cart/index.js'
import { postProcessCart } from './post-process-cart/index.js'
import { removeItems } from './remove-items/index.js'

/**
 * Broadcast a message to the cart message bus
 */
const broadcast = (message: AllCartMessages): void => {
  cartMessageBus.send(message)
}

/**
 * We collect all operations into a hashmap to do dependency injection
 * into epics for unit testing
 */
export const Operations = {
  addAttributes,
  addItems,
  addNote,
  applyDiscounts,
  broadcast,
  changeItemProperties,
  changeItemQuantity,
  changeItemSellingPlan,
  changeItemVariant,
  clearCart,
  clearDiscounts,
  fetchCart,
  getCurrentTimestamp,
  postProcessCart,
  removeItems
} as const

export type Operations = typeof Operations
