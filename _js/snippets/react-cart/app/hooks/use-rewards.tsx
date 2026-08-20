import { useMemo } from 'react'
import type { CartItem } from '../../../../core/cart-v2/blueprints/cart/item.js'
import { useCartState } from '../../../../core/cart-v2/react.js'
import type { Product } from '../../../../core/shopify/schemas/product.js'
import {
  computeCartTotalForRewards,
  getRewardTiersForCart,
  getTierRewardId,
  getTierValue
} from '../helpers.js'
import type { CartRewardItem } from '../io.js'

type UseRewardsProps = {
  tiers: CartRewardItem[]
  /** Same as theme “Include Discounts in Rewards”: true → `final_line_price`, false → `original_line_price`. */
  includeDiscountsInRewards: boolean
}

export type UseRewardsReturn = {
  activeTier: CartRewardItem | null
  tierRewards: Product[] | null
  hasTierRewards: boolean
  hasProductsToRemove: boolean
  productsToRemove: string[]
  isLoading: boolean
  applicableTiers: Array<{
    tier: CartRewardItem
    products: Product[]
  }>
}

/**
 * Remove gift lines whose tier is no longer qualified. Empty `qualifiedTiers`
 * removes all configured reward gifts. Do not key off the progress “active”
 * tier — a product-less tier (e.g. free shipping) as active would strip GWP
 * while auto-add still re-adds it, causing an infinite loop.
 */
const getProductsToRemove = (
  cartItems: CartItem[],
  qualifiedTiers: CartRewardItem[],
  allTiers: CartRewardItem[]
): { hasProductsToRemove: boolean; itemKeys: string[] } => {
  if (!cartItems || !allTiers.length) {
    return { hasProductsToRemove: false, itemKeys: [] }
  }

  const allTierIds = allTiers.map((tier) => getTierRewardId(tier))
  const qualifiedTierIds = new Set(
    qualifiedTiers.map((tier) => getTierRewardId(tier))
  )

  const matchingItems = cartItems.filter((item) => {
    if (!item.properties) {
      return false
    }
    const { _reward_id: rewardId } = item.properties
    if (rewardId === undefined || rewardId === null) {
      return false
    }
    const id = Number(rewardId)
    return allTierIds.includes(id) && !qualifiedTierIds.has(id)
  })

  return {
    hasProductsToRemove: matchingItems.length > 0,
    itemKeys: matchingItems.map((item) => item.key)
  }
}

const hasProductInCart = (
  cartItems: CartItem[],
  products: Product[] | null,
  activeTierId: number
): boolean => {
  if (!cartItems || !products || products.length === 0) {
    return false
  }

  // Check if any cart item has the current tier's reward ID in its properties
  const rewardItems = cartItems.filter((item) => {
    if (!item.properties) {
      return false
    }

    const rewardId = item.properties._reward_id
    return (
      rewardId !== undefined &&
      rewardId !== null &&
      Number(rewardId) === activeTierId
    )
  })

  // If we have any reward items from this tier, we've already claimed a reward
  return rewardItems.length > 0
}

export const useRewards = ({
  tiers,
  includeDiscountsInRewards
}: UseRewardsProps): UseRewardsReturn => {
  const isReady = useCartState((_, s) => s === 'Ready')
  const cartItems = useCartState((c) =>
    c.__type === 'Cart' ? c.cart.items : []
  )
  const cartTotalPrice = useCartState((c) =>
    c.__type === 'Cart' ? c.cart.total_price : undefined
  )
  const itemsSubtotalPrice = useCartState((c) =>
    c.__type === 'Cart' ? c.cart.items_subtotal_price : undefined
  )

  const rewards = useMemo((): UseRewardsReturn => {
    const defaultReturn: UseRewardsReturn = {
      activeTier: null,
      tierRewards: null,
      hasTierRewards: false,
      hasProductsToRemove: false,
      productsToRemove: [],
      isLoading: false,
      applicableTiers: []
    }

    if (!Array.isArray(tiers) || tiers.length === 0) {
      return defaultReturn
    }

    if (
      !isReady ||
      cartTotalPrice === undefined ||
      itemsSubtotalPrice === undefined
    ) {
      return { ...defaultReturn, isLoading: true }
    }

    const items = cartItems
    const cartTotal = computeCartTotalForRewards({
      cartItems: items,
      cartTotalPrice,
      itemsSubtotalPrice,
      includeDiscountsInRewards
    })

    const validTiers = getRewardTiersForCart(tiers)

    if (validTiers.length === 0) {
      return defaultReturn
    }

    const qualifiedTiers = validTiers.filter((tier) => {
      const tierValue = getTierValue(tier)
      const isQualified = cartTotal >= tierValue
      return isQualified
    })

    if (qualifiedTiers.length === 0) {
      const { hasProductsToRemove, itemKeys: productsToRemove } = items.length
        ? getProductsToRemove(items, [], validTiers)
        : { hasProductsToRemove: false, itemKeys: [] }

      if (hasProductsToRemove) {
        return {
          ...defaultReturn,
          hasProductsToRemove,
          productsToRemove
        }
      }

      return defaultReturn
    }

    let activeTier: CartRewardItem | null = null

    if (qualifiedTiers.length > 0) {
      const firstTier = qualifiedTiers[0]
      if (firstTier) {
        activeTier = firstTier

        for (const tier of qualifiedTiers) {
          if (getTierValue(tier) > getTierValue(activeTier)) {
            activeTier = tier
          }
        }
      }
    }

    if (!activeTier) {
      return defaultReturn
    }

    const applicableTiers = qualifiedTiers.map((tier) => {
      const tierProducts = tier.products ?? []
      const hasTierProductInCart = hasProductInCart(
        items,
        tierProducts,
        getTierRewardId(tier)
      )

      return {
        tier,
        products: hasTierProductInCart ? [] : tierProducts
      }
    })

    const allTierRewards = applicableTiers.flatMap((t) => t.products)
    const tierRewards = allTierRewards.length > 0 ? allTierRewards : null
    const hasTierRewards = Boolean(tierRewards && tierRewards.length > 0)

    const { hasProductsToRemove, itemKeys: productsToRemove } = items.length
      ? getProductsToRemove(items, qualifiedTiers, validTiers)
      : { hasProductsToRemove: false, itemKeys: [] }

    return {
      activeTier,
      tierRewards,
      hasTierRewards,
      hasProductsToRemove,
      productsToRemove,
      isLoading: false,
      applicableTiers
    }
  }, [
    cartItems,
    cartTotalPrice,
    includeDiscountsInRewards,
    isReady,
    itemsSubtotalPrice,
    tiers
  ])

  return rewards
}
