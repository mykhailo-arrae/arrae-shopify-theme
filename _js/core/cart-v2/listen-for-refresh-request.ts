import { initMainBus } from '../messaging/main/index.js'

export const REQUEST_CART_REFRESH = 'request:cart:refresh' as const

type CartRefreshSender = {
  send: (event: { type: 'RefreshCart'; payload: null }) => void
}

const refreshCart = (cart: CartRefreshSender): void => {
  cart.send({ type: 'RefreshCart', payload: null })
}

/**
 * Listen for cart refresh requests from the main message bus and from
 * `window` CustomEvents (for console / third-party scripts).
 *
 * @example Theme / bundled code
 * ```ts
 * initMainBus().send({
 *   name: 'request:cart:refresh',
 *   details: null,
 *   source: { type: 'global' }
 * })
 * ```
 *
 * @example Console / third-party
 * ```ts
 * window.dispatchEvent(new CustomEvent('request:cart:refresh'))
 * ```
 */
export const listenForRefreshRequest = (cart: CartRefreshSender): void => {
  initMainBus()
    .on(REQUEST_CART_REFRESH)
    .do(() => {
      refreshCart(cart)
    })

  window.addEventListener(REQUEST_CART_REFRESH, () => {
    refreshCart(cart)
  })
}
