import { type FC, useCallback, useEffect, useMemo } from 'react'
import { initCart } from '../../../../core/cart-v2/index.js'
import { initMainBus } from '../../../../core/messaging/main/index.js'
import { atShopifyRoot } from '../../../../core/network/shopify-root.js'
import { useProductData } from '../../../../core/project/api/use-product-data.js'
import { formatMoney } from '../../../../core/shopify/format-money.js'
import { getLocaleString } from '../../../../core/shopify/get-locale-string.js'
import styles from '../../styles.scss.js'
import { useCartContext } from '../context.js'
import { getLineItemMarketingCopy } from '../helpers.js'

type UpsellProductProps = {
  handle: string
  money_format: string
  onFirstVariantUnavailable?: (handle: string) => void
}

const cart = initCart()
const mainBus = initMainBus()

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()

const UpsellProduct: FC<UpsellProductProps> = ({
  handle,
  money_format,
  onFirstVariantUnavailable
}) => {
  const { state } = useCartContext()
  const { data: product } = useProductData(handle)

  const productVariants = useMemo(
    () =>
      state.data.cart_product_variants?.find(
        (entry) => entry.product_id === product?.product.id
      ) ?? null,
    [state.data.cart_product_variants, product?.product.id]
  )

  const marketingCopy = useMemo(() => {
    const fromTheme = getLineItemMarketingCopy(productVariants)
    if (fromTheme) {
      return fromTheme
    }
    const fromProductApi =
      product?.metafields.product_card_marketing_copy?.trim()
    if (fromProductApi && fromProductApi !== '&nbsp;') {
      return fromProductApi
    }
    const description = product?.product.description
    if (!description) {
      return null
    }
    const stripped = stripHtml(description)
    return stripped.length > 0 && stripped !== '&nbsp;' ? stripped : null
  }, [
    productVariants,
    product?.metafields.product_card_marketing_copy,
    product?.product.description
  ])

  useEffect(() => {
    if (!product || !onFirstVariantUnavailable) {
      return
    }
    const firstVariantAvailable =
      product.variants[0]?.variant?.available ??
      product.product.variants?.[0]?.available
    if (firstVariantAvailable === false) {
      onFirstVariantUnavailable(handle)
    }
  }, [product, handle, onFirstVariantUnavailable])

  const handleAddToCart = useCallback(async () => {
    if (!product) {
      return
    }

    const variantId = product.variants[0]?.variant.id

    if (!variantId) {
      console.error('No variant found for product', product.product.handle)
      return
    }

    try {
      const result = await cart.sendAsync({
        type: 'AddItems',
        payload: {
          items: [
            {
              id: variantId,
              quantity: 1
            }
          ]
        }
      })

      if (result === 'busy') {
        console.warn('Cart is busy, cannot add item at the moment')
        return
      }

      mainBus.send({
        name: 'notification:added-item-to-cart',
        details: null,
        source: { type: 'global' }
      })
    } catch (err) {
      console.error('Add to cart failed', err)
    }
  }, [product])

  if (!product) {
    return null
  }

  const productUrl = atShopifyRoot(
    `/products/${product.product.handle}`
  ).toString()
  const imageUrl =
    productVariants?.card_image_url ?? product.product.images[0] ?? ''

  return (
    <div className={styles.upsell__product} role="listitem">
      <div className={styles.upsell__product__content}>
        <a className={styles.upsell__product__media} href={productUrl}>
          {imageUrl ? (
            <img
              loading="lazy"
              src={imageUrl}
              className={styles.upsell__product__image}
              alt={product.product.title}
            />
          ) : null}
        </a>
        <div className={styles.upsell__product__right}>
          <div className={styles.upsell__product__details}>
            <div>
              <div className={styles.upsell__product__header}>
                <h2 className={styles.upsell__product__title}>
                  <a href={productUrl}>{product.product.title}</a>
                </h2>
                <div className={styles.upsell__product__price}>
                  {formatMoney(product.product.price ?? 0, money_format)}
                </div>
              </div>
              {marketingCopy ? (
                <p className={styles.upsell__product__marketingCopy}>
                  {marketingCopy}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className={styles.upsell__product__add}
              onClick={handleAddToCart}
              data-tvg-track="button_click"
              data-tvg-track-label={getLocaleString(
                'snippets.react_cart.upsell_add_to_cart'
              )}
            >
              {getLocaleString('snippets.react_cart.upsell_add_to_cart')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UpsellProduct
