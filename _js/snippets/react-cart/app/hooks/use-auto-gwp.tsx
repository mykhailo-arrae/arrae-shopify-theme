import { useEffect, useRef, useState } from 'react'
import { initCart } from '../../../../core/cart-v2/index.js'
import { initMainBus } from '../../../../core/messaging/main/index.js'
import { getLocaleString } from '../../../../core/shopify/get-locale-string.js'
import type { Product } from '../../../../core/shopify/schemas/product.js'
import { getTierRewardId } from '../helpers.js'
import type { CartRewardItem } from '../io.js'

const cart = initCart()
const mainMessageBus = initMainBus()

const AUTO_GWP_ADD_FAILED_KEY = 'snippets.react_cart.auto_gwp_add_failed'

const AUTO_GWP_ADD_FAILED_FALLBACK =
  'There was a problem adding your Gift with Purchase product.'

const getAutoGwpErrorMessage = (): string =>
  getLocaleString(AUTO_GWP_ADD_FAILED_KEY, {
    fallback: AUTO_GWP_ADD_FAILED_FALLBACK
  })

type UseAutoGwpProps = {
  applicableTiers: Array<{
    tier: CartRewardItem
    products: Product[]
  }>
  isReady: boolean
  /** False while useRewards is loading (cart busy); avoids clearing errors mid-add. */
  rewardsDataReady: boolean
  enableLoadingStyles: () => void
  disableLoadingStyles: () => void
}

export type UseAutoGwpReturn = {
  autoGwpError: string | null
}

const getTiersNeedingAutoAdd = (
  applicableTiers: UseAutoGwpProps['applicableTiers']
): Set<number> => {
  const ids = new Set<number>()
  for (const { tier, products } of applicableTiers) {
    if (products.length === 1) {
      ids.add(getTierRewardId(tier))
    }
  }
  return ids
}

/**
 * Automatically add the GWP line only when a tier has exactly 1
 * product (no choice). If the tier lists two or more products, the customer picks in
 * {@link Rewards}; this hook does not add to cart.
 *
 * Each tier is auto-added at most once per eligibility period (until the tier no longer
 * needs an auto-add). Permanent failures (OOS, API error) surface
 * {@link UseAutoGwpReturn.autoGwpError}; transient cart-busy responses retry when ready.
 */
export const useAutoGwp = ({
  applicableTiers,
  isReady,
  rewardsDataReady,
  enableLoadingStyles,
  disableLoadingStyles
}: UseAutoGwpProps): UseAutoGwpReturn => {
  const [autoGwpError, setAutoGwpError] = useState<string | null>(null)
  const inFlightTiersRef = useRef<Set<number>>(new Set())
  const failedTiersRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!rewardsDataReady) {
      return
    }

    const tiersNeedingAutoAdd = getTiersNeedingAutoAdd(applicableTiers)

    for (const tierId of failedTiersRef.current) {
      if (!tiersNeedingAutoAdd.has(tierId)) {
        failedTiersRef.current.delete(tierId)
      }
    }

    for (const tierId of inFlightTiersRef.current) {
      if (!tiersNeedingAutoAdd.has(tierId)) {
        inFlightTiersRef.current.delete(tierId)
      }
    }

    if (tiersNeedingAutoAdd.size === 0) {
      setAutoGwpError(null)
    }
  }, [applicableTiers, rewardsDataReady])

  useEffect(() => {
    if (!isReady) {
      return
    }

    if (!applicableTiers || applicableTiers.length === 0) {
      return
    }

    const markTierFailed = (
      tierId: number,
      reason: string,
      details?: Record<string, unknown>
    ): void => {
      failedTiersRef.current.add(tierId)
      const message = getAutoGwpErrorMessage()
      console.error('Auto GWP add failed', reason, {
        tierId,
        message,
        ...details
      })
      setAutoGwpError(message)
    }

    for (const { tier, products } of applicableTiers) {
      if (!products || products.length === 0) {
        continue
      }

      if (products.length !== 1) {
        continue
      }

      const product = products[0]
      if (!product) {
        continue
      }

      const tierId = getTierRewardId(tier)

      if (inFlightTiersRef.current.has(tierId)) {
        continue
      }

      if (failedTiersRef.current.has(tierId)) {
        continue
      }

      const availableVariant = product.variants.find((v) => v.available)
      const variantSummary = product.variants.map((v) => ({
        id: v.id,
        available: v.available
      }))

      if (!availableVariant?.id || availableVariant.id < 1) {
        markTierFailed(tierId, 'no_available_variant', {
          productId: product.id,
          productHandle: product.handle,
          variants: variantSummary
        })
        continue
      }

      const variantId = availableVariant.id
      const compoundId = `${tierId}:${product.id}`

      inFlightTiersRef.current.add(tierId)
      enableLoadingStyles()

      void (async () => {
        try {
          const result = await cart.sendAsync({
            type: 'AddItems',
            payload: {
              items: [
                {
                  id: variantId,
                  quantity: 1,
                  properties: {
                    _reward_id: tierId,
                    _reward_title: tier.title,
                    _product_id: product.id,
                    _compound_id: compoundId,
                    _reward_key: compoundId,
                    _is_free_gift: true
                  }
                }
              ]
            }
          })

          if (result === 'busy') {
            inFlightTiersRef.current.delete(tierId)
            disableLoadingStyles()
            return
          }

          inFlightTiersRef.current.delete(tierId)
          setAutoGwpError(null)
          mainMessageBus.send({
            name: 'core:cart:update',
            details: null,
            source: { type: 'global' }
          })
          disableLoadingStyles()
        } catch (err: unknown) {
          inFlightTiersRef.current.delete(tierId)
          markTierFailed(tierId, 'add_items_error', {
            variantId,
            error: err
          })
          disableLoadingStyles()
        }
      })()
    }
  }, [applicableTiers, isReady, disableLoadingStyles, enableLoadingStyles])

  return { autoGwpError }
}
