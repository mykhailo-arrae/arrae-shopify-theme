import type { FC } from 'react'
import { useCartState } from '../../../../core/cart-v2/react.js'
import { atShopifyRoot } from '../../../../core/network/shopify-root.js'
import { formatMoney } from '../../../../core/shopify/format-money.js'
import { getLocaleString } from '../../../../core/shopify/get-locale-string.js'
import styles from '../../styles.scss.js'
import { useCartContext } from '../context.js'
import { getCartOrderDiscounts } from '../helpers.js'

const Summary: FC = () => {
  const { state } = useCartContext()
  const moneyFormat = state.data.market?.money_format ?? ''
  const itemsSubtotalPrice = useCartState((c) =>
    c.__type === 'Cart' ? c.cart.items_subtotal_price : 0
  )
  const totalPrice = useCartState((c) =>
    c.__type === 'Cart' ? c.cart.total_price : 0
  )
  const orderDiscounts = useCartState((c) =>
    c.__type === 'Cart'
      ? getCartOrderDiscounts(c.cart.cart_level_discount_applications)
      : []
  )
  const hasOrderDiscount = orderDiscounts.length > 0

  return (
    <div className={styles.summary}>
      <form method="post" action={atShopifyRoot('/cart').toString()}>
        <div className={styles.summary__frame}>
          <div className={styles.summary__content}>
            <div className={styles.summary__rows}>
              {hasOrderDiscount ? (
                <>
                  <div className={styles.summary__row}>
                    <span className={styles.summary__row__label}>
                      {getLocaleString('snippets.react_cart.subtotal')}
                    </span>
                    <span className={styles.summary__row__value}>
                      {formatMoney(itemsSubtotalPrice, moneyFormat)}
                    </span>
                  </div>

                  {orderDiscounts.map((discount) => (
                    <div
                      key={discount.key}
                      className={`${styles.summary__row} ${styles.summary__row_discount}`}
                    >
                      <span className={styles.summary__row__label}>
                        {getLocaleString('snippets.react_cart.order_discount')}
                        {discount.title ? (
                          <span className={styles.summary__row__discountTitle}>
                            {discount.title}
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.summary__row__value}>
                        −{formatMoney(discount.amountCents, moneyFormat)}
                      </span>
                    </div>
                  ))}

                  <div
                    className={`${styles.summary__row} ${styles.summary__row_total}`}
                  >
                    <span className={styles.summary__row__label}>
                      {getLocaleString('snippets.react_cart.total')}
                    </span>
                    <span className={styles.summary__row__value}>
                      {formatMoney(totalPrice, moneyFormat)}
                    </span>
                  </div>
                </>
              ) : (
                <div
                  className={`${styles.summary__row} ${styles.summary__row_total}`}
                >
                  <span className={styles.summary__row__label}>
                    {getLocaleString('snippets.react_cart.subtotal')}
                  </span>
                  <span className={styles.summary__row__value}>
                    {formatMoney(totalPrice, moneyFormat)}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.summary__actions}>
              <button
                name="checkout"
                type="submit"
                className={styles.summary__button}
                data-tvg-track="button_click"
                data-tvg-track-label={getLocaleString(
                  'snippets.react_cart.checkout'
                )}
                data-tvg-track-target="cart_checkout_button"
                data-tvg-track-event="cart_checkout_click"
              >
                <span>{getLocaleString('snippets.react_cart.checkout')}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default Summary
