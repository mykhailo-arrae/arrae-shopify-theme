import clsx from 'clsx'
import { type FC, Fragment, useLayoutEffect, useRef, useState } from 'react'
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
  const mainRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [isSidebarSticky, setIsSidebarSticky] = useState(false)

  useLayoutEffect(() => {
    const main = mainRef.current
    const sidebar = sidebarRef.current

    if (!main || !sidebar || isEmpty) {
      setIsSidebarSticky(false)
      return
    }

    const desktopQuery = window.matchMedia('(min-width: 1024px)')

    const updateSticky = (): void => {
      if (!desktopQuery.matches) {
        setIsSidebarSticky(false)
        return
      }

      const pageScrolls =
        document.documentElement.scrollHeight > window.innerHeight + 1
      const mainTallerThanSidebar = main.offsetHeight > sidebar.offsetHeight

      setIsSidebarSticky(pageScrolls && mainTallerThanSidebar)
    }

    updateSticky()

    const resizeObserver = new ResizeObserver(updateSticky)
    resizeObserver.observe(main)
    resizeObserver.observe(sidebar)

    desktopQuery.addEventListener('change', updateSticky)
    window.addEventListener('resize', updateSticky)

    return () => {
      resizeObserver.disconnect()
      desktopQuery.removeEventListener('change', updateSticky)
      window.removeEventListener('resize', updateSticky)
    }
  }, [isEmpty])

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
        styles.page
      )}
      data-section-id={state.data.section_id}
      data-section-name="cart_page"
    >
      <div className={styles.page__header}>
        <h1 className={styles.title}>
          <span>{getLocaleString('snippets.react_cart.page_title')}</span>
          {
            <>
              <span className={styles.title__countDrawer}>({itemCount})</span>
              <span className={styles.title__countDesktop}>({itemCount})</span>
            </>
          }
        </h1>
      </div>

      {/*
        Keep upsells in one persistent tree so Rebuy's data-rebuy-id mount is not
        destroyed when switching empty ↔ filled cart.
      */}
      <div
        className={clsx(isEmpty ? styles.page__emptyState : styles.page__grid)}
      >
        {isEmpty ? (
          <Empty hasUpsellBelow={showUpsells} />
        ) : (
          // Keyed Fragment = one sibling slot (unlike <> which flattens). Keeps
          // the upsell at a stable index across empty ↔ filled so UpsellRebuy
          // is not remounted. No DOM wrapper — page__grid still sees sidebar/main.
          <Fragment key="cart-page-filled">
            <div
              className={clsx(styles.page__sidebar, [
                isUpdating && 'is-updating'
              ])}
            >
              <div
                ref={sidebarRef}
                className={clsx(styles.page__sidebar__wrapper, {
                  [styles['page__sidebar__wrapper--sticky']]: isSidebarSticky
                })}
              >
                {enable_discount_code_input && <DiscountCodeInput />}
                {rewards && rewards.enabled && (
                  <>
                    <Progress data={state.data} autoGwpError={autoGwpError} />
                    <Rewards />
                  </>
                )}
                <div className={styles.desktop}>
                  <Summary />
                </div>
              </div>
            </div>

            <div
              className={clsx(styles.page__main, [isUpdating && 'is-updating'])}
            >
              <div ref={mainRef} className={styles.contents}>
                <Contents items={cartItems} />
              </div>
            </div>
          </Fragment>
        )}

        {showUpsells && (
          <div
            key="cart-page-upsell"
            className={clsx(
              styles.upsell,
              styles['upsell--pageGrid'],
              isEmpty ? styles['upsell--emptyDrawer'] : styles.page__upsell
            )}
          >
            {upsell.source === 'theme' && <Upsell />}

            {upsell.source === 'rebuy' && <UpsellRebuy />}
          </div>
        )}

        {!isEmpty && (
          <div
            className={clsx(styles.page__footer, styles.mobile, [
              isUpdating && 'is-updating'
            ])}
          >
            {enable_discount_code_input && <DiscountCodeInput />}
            <Summary />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
