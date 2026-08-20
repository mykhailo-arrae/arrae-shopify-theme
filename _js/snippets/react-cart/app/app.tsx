import { type FC, useEffect, useMemo, useRef } from 'react'
import { useCartState } from '../../../core/cart-v2/react.js'
import { initMainBus } from '../../../core/messaging/main/index.js'
import {
  AutoGwpErrorProvider,
  CartProvider,
  SharedRewardsProvider,
  useCartContext,
  useSharedRewards
} from './context.js'
import { getCartOrderDiscounts, getCartSyncFingerprint } from './helpers.js'
import { useAutoGwp } from './hooks/use-auto-gwp.js'
import { useCartProductVariants } from './hooks/use-cart-product-variants.js'
import { useRemoveRewardItems } from './hooks/use-remove-reward-items.js'
import type { CartDataProps } from './io.js'
import Drawer from './layouts/drawer.js'
import Page from './layouts/page.js'

const autoGwpLoadingNoop = (): void => {}

export const CartApp: FC = () => {
  const { state } = useCartContext()
  const { layout, rewards } = state.data
  const messageBus = initMainBus()
  const cartItems = useCartState((c) =>
    c.__type === 'Cart' ? c.cart.items : []
  )
  const cartTotalPrice = useCartState((c) =>
    c.__type === 'Cart' ? c.cart.total_price : 0
  )
  const cartOrderDiscounts = useCartState((c) =>
    c.__type === 'Cart'
      ? getCartOrderDiscounts(c.cart.cart_level_discount_applications)
      : []
  )
  const cartReady = useCartState((_, s) => s === 'Ready')
  const cartFingerprint = useMemo(
    () => getCartSyncFingerprint(cartItems, cartTotalPrice, cartOrderDiscounts),
    [cartItems, cartOrderDiscounts, cartTotalPrice]
  )
  const { applicableTiers, isLoading, hasProductsToRemove, productsToRemove } =
    useSharedRewards()
  const isEmpty = cartItems.length === 0
  const autoGwpActive = rewards.enabled && rewards.enable_auto_gwp && !isEmpty

  const skipCartUpdateBroadcastRef = useRef(true)

  const rewardsDataReady = cartReady && !isLoading

  const { autoGwpError } = useAutoGwp({
    applicableTiers: autoGwpActive ? applicableTiers : [],
    isReady: autoGwpActive && rewardsDataReady,
    rewardsDataReady: autoGwpActive && rewardsDataReady,
    enableLoadingStyles: autoGwpLoadingNoop,
    disableLoadingStyles: autoGwpLoadingNoop
  })

  useCartProductVariants()

  // Remove reward items if they are not eligible anymore
  useRemoveRewardItems({
    cartReady,
    isLoadingRewards: isLoading,
    hasProductsToRemove,
    productsToRemove
  })

  useEffect(() => {
    // cartFingerprint: effect must re-run when lines change; value unused on purpose
    void cartFingerprint
    if (skipCartUpdateBroadcastRef.current) {
      skipCartUpdateBroadcastRef.current = false
      return
    }
    messageBus.send({
      name: 'core:cart:update',
      details: null,
      source: { type: 'global' }
    })
  }, [messageBus, cartFingerprint])

  return (
    <AutoGwpErrorProvider autoGwpError={autoGwpError}>
      {layout === 'page' && <Page />}
      {layout === 'drawer' && <Drawer />}
    </AutoGwpErrorProvider>
  )
}

export const App: FC<CartDataProps> = ({ data }) => (
  <CartProvider initialState={{ data }}>
    <SharedRewardsProvider>
      <CartApp />
    </SharedRewardsProvider>
  </CartProvider>
)
