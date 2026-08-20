import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useCartState } from '../../../../core/cart-v2/react.js'
import { useRecommendationsData } from '../../../../core/project/api/use-recommendations-data.js'
import styles from '../../styles.scss.js'
import Loading from '../components/loading.js'
import { useCartContext } from '../context.js'
import UpsellProduct from './upsell-product.js'

const UPSELL_MAX_QUANTITY = 8
const UPSELL_MIN_QUANTITY = 1
const UPSELL_DEFAULT_QUANTITY = 4

const clampUpsellMaxQuantity = (value: number | undefined): number =>
  Math.min(
    UPSELL_MAX_QUANTITY,
    Math.max(
      UPSELL_MIN_QUANTITY,
      Math.floor(value ?? UPSELL_DEFAULT_QUANTITY) || UPSELL_DEFAULT_QUANTITY
    )
  )

type UpsellProductCandidate = {
  available?: boolean
  tags: string[]
  handle: string
  variants?: {
    available?: boolean
    variant?: { available?: boolean }
  }[]
}

const isFirstVariantAvailable = (product: UpsellProductCandidate): boolean => {
  const first =
    product.variants?.length && product.variants.length > 0
      ? product.variants[0]
      : null

  if (first) {
    return (
      first.variant?.available ?? first.available ?? product.available ?? true
    )
  }

  return product.available ?? true
}

const filterEligibleUpsellProducts = (
  products: UpsellProductCandidate[] | null | undefined,
  tagsToIgnore: string[],
  cartHandles: Set<string>
): UpsellProductCandidate[] =>
  (products ?? []).filter(
    (product) =>
      isFirstVariantAvailable(product) &&
      !tagsToIgnore.some((tag) => product.tags.includes(tag.trim())) &&
      !cartHandles.has(product.handle)
  )

/**
 * Cart upsell list: suggests additional products to add (paid lines). It is
 * separate from tier gifts ({@link Rewards} / {@link RewardItem}): upsell
 * add-to-cart uses plain {@link UpsellProduct} `AddItems` payloads **without**
 * `_reward_id`, `_is_free_gift`, or other GWP line properties, so Shopify
 * Functions that zero out gift lines should ignore these items.
 *
 * **Product list**
 *
 * - If the theme passes `collection_products` in cart JSON, those products are shown
 *   (in collection order). In-stock / eligible products are filtered first, then capped
 *   at `max_quantity` so out-of-stock items early in the collection do not block later ones.
 * - Otherwise the Storefront recommendations API is used via
 *   {@link useRecommendationsData}, keyed by a **stable** cart product id: one
 *   random id from the current cart is kept until that product leaves the cart,
 *   so the recommendation set does not flicker on every render.
 *
 * **Filtering**
 *
 * - Drops products whose first variant is unavailable (including after
 *   {@link useProductData} reports via `onFirstVariantUnavailable`).
 * - Excludes products whose handle is already in the cart.
 * - Excludes products containing any tag listed in `tags_to_ignore` (comma-separated).
 *
 * **UI**
 *
 * - Renders a vertical list (same rhythm as {@link Contents} line items).
 * - Shows at most `max_quantity` products from theme settings (1–8; recommendations
 *   API and manual collection). Shows a loading state while cart state is initializing.
 */

const Upsell: FC = () => {
  const { state } = useCartContext()
  const { upsell, market } = state.data
  const { enabled, tags_to_ignore, title, collection_products, max_quantity } =
    upsell

  const productLimit = clampUpsellMaxQuantity(max_quantity)

  const cartItems = useCartState((c) => c.cart?.items ?? [])
  const isInitializing = useCartState((_, s) => s === 'Initializing')

  /** Stable product id for the recommendations API — only changes when the cart no longer contains the previous id. */
  const [productIdForRecommendations, setProductIdForRecommendations] =
    useState<number | null>(null)

  useEffect(() => {
    const productIds = cartItems
      .map((item: { product_id: number | null }) => item.product_id)
      .filter((id): id is number => id != null)

    setProductIdForRecommendations((prev) => {
      if (prev !== null && productIds.includes(prev)) {
        return prev
      }
      if (productIds.length === 0) {
        return null
      }
      const randomIndex = Math.floor(Math.random() * productIds.length)
      return productIds[randomIndex] ?? null
    })
  }, [cartItems])

  const { data: recommendations } = useRecommendationsData(
    productIdForRecommendations,
    { limit: productLimit }
  )

  const cartHandles = useMemo(
    () =>
      new Set(
        cartItems
          .map((item: { handle: string | null }) => item.handle)
          .filter((handle): handle is string => !!handle)
      ),
    [cartItems]
  )

  const tagsToIgnore = useMemo(
    () =>
      tags_to_ignore
        ?.split(',')
        .map((tag) => tag.trim())
        .filter(Boolean) ?? [],
    [tags_to_ignore]
  )

  const manualCollectionProducts = useMemo(() => {
    if (!collection_products?.length) {
      return null
    }

    return filterEligibleUpsellProducts(
      collection_products,
      tagsToIgnore,
      cartHandles
    ).slice(0, productLimit)
  }, [collection_products, tagsToIgnore, cartHandles, productLimit])

  const productsToUse = manualCollectionProducts ?? recommendations?.products

  const stableProductsRef = useRef(productsToUse)
  if (productsToUse && productsToUse.length > 0) {
    stableProductsRef.current = productsToUse
  }

  const stableProductsToUse = productsToUse ?? stableProductsRef.current

  const availableProducts = useMemo(() => {
    if (manualCollectionProducts) {
      return manualCollectionProducts
    }

    return filterEligibleUpsellProducts(
      stableProductsToUse,
      tagsToIgnore,
      cartHandles
    )
  }, [manualCollectionProducts, stableProductsToUse, tagsToIgnore, cartHandles])

  const [unavailableFirstVariantHandles, setUnavailableFirstVariantHandles] =
    useState<Set<string>>(() => new Set())
  const handleFirstVariantUnavailable = useCallback((handle: string) => {
    setUnavailableFirstVariantHandles((prev) => new Set(prev).add(handle))
  }, [])

  const productsToDisplay = useMemo(
    () =>
      availableProducts?.filter(
        (p: { handle: string }) => !unavailableFirstVariantHandles.has(p.handle)
      ) ?? [],
    [availableProducts, unavailableFirstVariantHandles]
  )

  const usesManualCollection = Boolean(collection_products?.length)

  if (!enabled || (!usesManualCollection && !stableProductsToUse?.length)) {
    return null
  }

  if (isInitializing) {
    return <Loading />
  }

  const displayedProducts = productsToDisplay.slice(0, productLimit)

  if (displayedProducts.length === 0) {
    return null
  }

  return (
    <>
      {title ? <h2 className={styles.upsell__title}>{title}</h2> : null}

      <div className={styles.upsell__list} role="list">
        {displayedProducts.map(
          (product: { handle: string | null }, index: number) =>
            product.handle ? (
              <UpsellProduct
                key={product.handle ?? `upsell-product-${index}`}
                handle={product.handle}
                money_format={market?.money_format ?? ''}
                onFirstVariantUnavailable={handleFirstVariantUnavailable}
              />
            ) : null
        )}
      </div>
    </>
  )
}

export default Upsell
