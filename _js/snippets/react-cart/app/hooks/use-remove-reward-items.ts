import { useEffect, useMemo, useRef } from 'react'
import { initCart } from '../../../../core/cart-v2/index.js'
import { initMainBus } from '../../../../core/messaging/main/index.js'

const cart = initCart()
const mainBus = initMainBus()

const KEY_SEP = '\u001e'

type UseRemoveRewardItemsProps = {
  cartReady: boolean
  isLoadingRewards: boolean
  hasProductsToRemove: boolean
  productsToRemove: string[]
}

/**
 * When {@link useRewards} marks tier gift lines as invalid (their tier threshold
 * is no longer met), dispatches a `RemoveItems` cart action.
 */
export const useRemoveRewardItems = ({
  cartReady,
  isLoadingRewards,
  hasProductsToRemove,
  productsToRemove
}: UseRemoveRewardItemsProps): void => {
  const removalKey = useMemo(
    () => [...productsToRemove].sort().join(KEY_SEP),
    [productsToRemove]
  )
  const lastAttemptKeyRef = useRef<string>('')

  useEffect(() => {
    if (!cartReady || isLoadingRewards) {
      return
    }
    if (!hasProductsToRemove || productsToRemove.length === 0) {
      lastAttemptKeyRef.current = ''
      return
    }
    if (lastAttemptKeyRef.current === removalKey) {
      return
    }
    lastAttemptKeyRef.current = removalKey

    const lineItemKeys = removalKey.split(KEY_SEP).filter(Boolean)

    void (async () => {
      try {
        const result = await cart.sendAsync({
          type: 'RemoveItems',
          payload: { lineItemKeys }
        })
        if (result === 'busy') {
          lastAttemptKeyRef.current = ''
          return
        }
        mainBus.send({
          name: 'core:cart:update',
          details: null,
          source: { type: 'global' }
        })
      } catch {
        lastAttemptKeyRef.current = ''
      }
    })()
  }, [
    cartReady,
    hasProductsToRemove,
    isLoadingRewards,
    removalKey,
    productsToRemove.length
  ])
}
