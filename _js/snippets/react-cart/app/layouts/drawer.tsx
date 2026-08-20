import clsx from 'clsx'
import type { FC } from 'react'
import { useCartState } from '../../../../core/cart-v2/react.js'
import { getLocaleString } from '../../../../core/shopify/get-locale-string.js'
import styles from '../../styles.scss.js'
import Contents from '../components/contents.js'
import DiscountCodeInput from '../components/discount-code-input.js'
import Empty from '../components/empty.js'
import Loading from '../components/loading.js'
import Progress from '../components/progress.js'
import Rewards from '../components/rewards.js'
import Summary from '../components/summary.js'
import Upsell from '../components/upsell.js'
import UpsellRebuy from '../components/upsell-rebuy.js'
import { useAutoGwpError, useCartContext } from '../context.js'

const App: FC = () => {
  const { state } = useCartContext()
  const { autoGwpError } = useAutoGwpError()
  const { rewards, upsell, enable_discount_code_input } = state.data
  const itemCount = useCartState((c) => c.cart?.item_count ?? 0)
  const cartItems = useCartState((c) =>
    c.__type === 'Cart' ? c.cart.items : []
  )
  const isInitializing = useCartState((_, s) => s === 'Initializing')
  const isUpdating = useCartState((_, s) => s !== 'Ready' && s !== 'Idle')

  const isEmpty = cartItems.length === 0
  const showUpsells = upsell?.enabled
  const showPromoBar = Boolean(
    state.data.promo_bar?.enabled && state.data.promo_bar?.text
  )

  if (isInitializing) {
    return (
      <div>
        <div>
          <Loading />
        </div>
      </div>
    )
  }

  return (
    <div
      className={clsx(
        [isUpdating && 'is-updating', isEmpty && 'is-empty'],
        styles.drawer
      )}
      data-section-id={state.data.section_id}
      data-section-name="cart_drawer"
      data-tvg-track-section-name="cart_drawer"
    >
      <div className={styles.drawer__header}>
        <h1 className={styles.title}>
          <span>{getLocaleString('snippets.react_cart.drawer_title')}</span>
          <span className={styles.title__countDrawer}>({itemCount})</span>
        </h1>
      </div>
      {showPromoBar && (
        <div className={styles.drawer__promoBar}>
          <span>{state.data.promo_bar?.text}</span>
        </div>
      )}
      <div className={styles.drawer__frame}>
        {/*
          Keep upsells in one persistent tree so Rebuy's data-rebuy-id mount is
          not destroyed when switching empty ↔ filled cart.
        */}
        <div
          className={clsx(
            isEmpty
              ? [
                  styles.drawer__emptyState,
                  showUpsells && styles['drawer__emptyState--withUpsell']
                ]
              : styles.drawer__sections
          )}
        >
          {isEmpty ? (
            <Empty hasUpsellBelow={showUpsells} />
          ) : (
            <div className={styles.drawer__main}>
              {rewards && rewards.enabled && (
                <>
                  <Progress data={state.data} autoGwpError={autoGwpError} />
                  <Rewards />
                </>
              )}
              <div className={styles.contents}>
                <Contents items={cartItems} />
              </div>
            </div>
          )}

          {showUpsells && (
            <div
              className={clsx(
                styles.upsell,
                isEmpty && styles['upsell--emptyDrawer']
              )}
            >
              {upsell.source === 'theme' && <Upsell />}

              {upsell.source === 'rebuy' && <UpsellRebuy />}
            </div>
          )}
        </div>
      </div>
      {!isEmpty && (
        <div className={styles.drawer__footer}>
          {enable_discount_code_input && <DiscountCodeInput />}
          <Summary />
        </div>
      )}
    </div>
  )
}

export default App
