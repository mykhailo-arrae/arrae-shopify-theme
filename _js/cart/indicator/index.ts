import { initCart } from '../../core/cart-v2/index.js'
import { findElements } from '../../core/dom/traversal/index.js'
import { getLocaleString } from '../../core/shopify/get-locale-string.js'

export const initIndicator = async (): Promise<void> => {
  const cart = initCart()

  cart.subscribe(({ context }) => {
    const itemCount = context.cart?.item_count ?? 0

    findElements(document, '.js-cart-item-count').forEach((counter) => {
      counter.textContent = `${itemCount}`
      counter.setAttribute('data-item-count', `${itemCount}`)
      const ariaLabel = getLocaleString('accessibility.icons.bag_count', {
        replacements: { count: itemCount.toString() },
        fallback: `(${itemCount.toString()}) items in the cart`
      })
      if (ariaLabel) {
        counter.setAttribute('aria-label', ariaLabel)
      }
    })
  })
}
