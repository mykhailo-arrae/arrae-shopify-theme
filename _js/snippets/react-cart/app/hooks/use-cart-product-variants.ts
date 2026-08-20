import { useEffect } from 'react'
import { useCartState } from '../../../../core/cart-v2/react.js'
import { useCartContext } from '../context.js'
import {
  fetchCartProductVariants,
  resolveCartSectionId
} from '../product-variants.js'

/**
 * Keeps `state.data.cart_product_variants` in sync when cart lines add new products.
 */
export const useCartProductVariants = (): void => {
  const { state, setState } = useCartContext()
  const { layout, section_id, cart_product_variants } = state.data
  const cartItems = useCartState((c) => c.cart?.items ?? [])

  useEffect(() => {
    const productIds = new Set(
      cartItems
        .map((item) => item.product_id)
        .filter((id): id is number => id != null)
    )

    if (productIds.size === 0) {
      if ((cart_product_variants?.length ?? 0) > 0) {
        setState((prev) => ({
          ...prev,
          data: { ...prev.data, cart_product_variants: [] }
        }))
      }
      return
    }

    const known = cart_product_variants ?? []
    const knownProductIds = new Set(known.map((entry) => entry.product_id))
    const hasMissing = [...productIds].some((id) => !knownProductIds.has(id))
    if (!hasMissing) {
      return
    }

    const sectionId = resolveCartSectionId(layout, section_id)
    if (!sectionId) {
      return
    }

    const controller = new AbortController()
    let cancelled = false

    fetchCartProductVariants({
      sectionId,
      signal: controller.signal
    })
      .then((data) => {
        if (cancelled || data == null) {
          return
        }
        setState((prev) => ({
          ...prev,
          data: { ...prev.data, cart_product_variants: data }
        }))
      })
      .catch(() => {
        // Ignore fetch errors; variant list updates after full refresh
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [cartItems, layout, section_id, cart_product_variants, setState])
}
