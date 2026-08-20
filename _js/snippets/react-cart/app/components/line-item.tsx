import clsx from 'clsx'
import { type FC, useCallback, useState } from 'react'
import type { CartItemProperties } from '../../../../core/cart-v2/blueprints/cart/item-properties.js'
import { initCart } from '../../../../core/cart-v2/index.js'
import { atShopifyRoot } from '../../../../core/network/shopify-root.js'
import { formatMoney } from '../../../../core/shopify/format-money.js'
import { getLocaleString } from '../../../../core/shopify/get-locale-string.js'
import styles from '../../styles.scss.js'
import { useCartContext } from '../context.js'
import {
  findVariantOption,
  getLineItemCardImageUrl,
  getLineItemMarketingCopy,
  getLineItemPriceDisplay,
  getLineItemVariantFlavorLabel,
  isFreeGiftProduct,
  lineItemHasLineLevelDiscount,
  lineItemHasVariantSelector,
  lineItemHidesQuantity
} from '../helpers.js'
import type { LineItemProps } from '../io.js'
import { IconButtonRemove, IconMinus, IconPlus } from './icons.js'
import LineItemDiscounts from './line-item-discounts.js'
import LineItemProperties from './line-item-properties.js'
import Quantity from './quantity.js'
import { VariantSelector } from './variant-selector.js'

const cart = initCart()

export type BundlePackageItem = {
  image: string
  title: string
  productTitle: string
  id: number
}

const cleanItemProperties = (
  properties: CartItemProperties | null
): Record<
  string,
  | string
  | number
  | boolean
  | (string | number | boolean | null | undefined)[]
  | null
> | null => {
  if (!properties) {
    return null
  }
  const cleaned: Record<
    string,
    | string
    | number
    | boolean
    | (string | number | boolean | null | undefined)[]
    | null
  > = {}
  for (const [key, value] of Object.entries(properties)) {
    if (
      value !== undefined &&
      (typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        Array.isArray(value) ||
        value === null)
    ) {
      cleaned[key] = value
    }
  }
  return cleaned
}

/* Displays line item as a bundle, with a dropdown to expand the items in the bundle
Update _bundlePackages property to match your project's bundle package properties */
const parseBundlePackages = (
  properties: Record<string, unknown> | null | undefined
): BundlePackageItem[] | null => {
  if (!properties?._bundlePackages) {
    return null
  }
  try {
    const raw = properties._bundlePackages
    const jsonStr = typeof raw === 'string' ? raw : JSON.stringify(raw)
    const parsed: unknown = JSON.parse(jsonStr)
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Validate structure of parsed items
      const isValid = parsed.every(
        (item): item is BundlePackageItem =>
          typeof item === 'object' &&
          item !== null &&
          'image' in item &&
          'title' in item &&
          'productTitle' in item &&
          'id' in item
      )
      if (isValid) {
        return parsed
      }
    }
  } catch {
    console.error('Invalid JSON, not a bundle', properties)
  }
  return null
}

const LineItem: FC<LineItemProps> = ({ data }) => {
  const { item } = data
  const [isBundleExpanded, setIsBundleExpanded] = useState(false)
  const { state } = useCartContext()

  // Parse bundle packages from item properties
  const bundlePackages = parseBundlePackages(item.properties)

  const handleRemoveClick = useCallback(() => {
    cart.send({
      type: 'RemoveItems',
      payload: {
        lineItemKeys: [item.key]
      }
    })
  }, [item.key])

  const [titleFirst, titleSecond] =
    item.product_title?.split('|').map((part) => part.trim()) ?? []

  const marketingCopy = getLineItemMarketingCopy(data.productVariants)

  const selectedVariant = findVariantOption(
    data.productVariants,
    item.variant_id
  )

  const variantFlavorLabel = getLineItemVariantFlavorLabel(
    selectedVariant?.title ?? item.variant_title,
    data.productVariants
  )

  const thumbnailUrl =
    typeof item.properties?._printessThumbnail === 'string' &&
    item.properties._printessThumbnail.length > 0
      ? item.properties._printessThumbnail
      : getLineItemCardImageUrl(data.productVariants, item.featured_image?.url)

  const moneyFormat = state.data.market?.money_format
  const isFreeGiftLine = isFreeGiftProduct(item.properties, item.price)
  const freeGiftLabel = getLocaleString(
    'snippets.react_cart.line_item_free_gift',
    { fallback: 'Free Gift' }
  )
  const lineSubtext = isFreeGiftLine ? freeGiftLabel : marketingCopy
  const freeLabel = getLocaleString('snippets.react_cart.free')
  const showVariantSelector = lineItemHasVariantSelector(data.productVariants)
  const hideQuantity = lineItemHidesQuantity(item, data.productVariants)
  const { finalCents, compareAtCents } = getLineItemPriceDisplay(item)

  const priceInner = isFreeGiftLine ? (
    <>
      <div className={styles.lineItem__price__value}>{freeLabel}</div>
      {compareAtCents != null && compareAtCents > 0 ? (
        <div className={styles.lineItem__price__original}>
          {formatMoney(compareAtCents, moneyFormat)}
        </div>
      ) : null}
    </>
  ) : (
    <>
      <div className={styles.lineItem__price__value}>
        {finalCents > 0 ? formatMoney(finalCents, moneyFormat) : freeLabel}
      </div>
      {compareAtCents != null ? (
        <div className={styles.lineItem__price__original}>
          {formatMoney(compareAtCents, moneyFormat)}
        </div>
      ) : null}
    </>
  )

  return (
    <div
      className={clsx(
        styles.lineItem,
        showVariantSelector && styles['lineItem--hasVariant']
      )}
    >
      <div
        className={styles.lineItem__content}
        role="group"
        aria-label={getLocaleString(
          'sections.cart-drawer.cart_item_group_aria_label'
        )}
      >
        {item.properties?._reward_title ? (
          <div className={styles.lineItem__media}>
            {thumbnailUrl && (
              <img
                loading="lazy"
                src={thumbnailUrl}
                className={styles.lineItem__image}
                alt={item.title ?? ''}
              />
            )}
          </div>
        ) : (
          <a
            className={styles.lineItem__media}
            href={atShopifyRoot(`/products/${item.handle ?? ''}`).toString()}
          >
            {thumbnailUrl && (
              <img
                loading="lazy"
                src={thumbnailUrl}
                className={styles.lineItem__image}
                alt={item.title ?? ''}
              />
            )}
          </a>
        )}
        <div
          className={clsx(
            styles.lineItem__body,
            !showVariantSelector && styles['lineItem__body--bottomAlign']
          )}
        >
          <div className={styles.lineItem__details}>
            <div className={styles.lineItem__info}>
              <div className={styles.lineItem__header}>
                <h2 className={styles.lineItem__title}>
                  <a
                    href={atShopifyRoot(
                      `/products/${item.handle ?? ''}`
                    ).toString()}
                  >
                    {titleFirst ?? item.product_title}
                  </a>
                </h2>
                <div className={styles.lineItem__price}>{priceInner}</div>
              </div>

              {variantFlavorLabel ? (
                <p className={styles.lineItem__marketingCopy}>
                  {variantFlavorLabel}
                </p>
              ) : null}

              {lineSubtext ? (
                <p className={styles.lineItem__marketingCopy}>{lineSubtext}</p>
              ) : null}
            </div>

            {showVariantSelector ? (
              <div className={styles.lineItem__subscription}>
                <VariantSelector
                  item={item}
                  productVariants={data.productVariants}
                />
              </div>
            ) : null}

            <div className={styles.lineItem__actionsRow}>
              <div
                className={styles.lineItem__quantity}
                data-id={item.variant_id}
              >
                {!isFreeGiftLine && !hideQuantity ? (
                  <Quantity data={{ item }} />
                ) : null}
              </div>

              <button
                className={styles.lineItem__remove}
                type="button"
                onClick={handleRemoveClick}
                data-tvg-track="button_click"
                data-tvg-track-label={getLocaleString(
                  'snippets.react_cart.remove'
                )}
              >
                <IconButtonRemove />
              </button>
            </div>
          </div>

          <div
            className={clsx(styles.lineItem__price, styles.lineItem__pagePrice)}
          >
            {priceInner}
          </div>

          <div className={styles.lineItem__extras}>
            <div>
              <div>
                {isFreeGiftLine ||
                (item.properties && Object.keys(item.properties).length > 0) ||
                (item.options_with_values &&
                  item.options_with_values.length > 0) ? (
                  <LineItemProperties
                    item={{
                      ...item,
                      properties: cleanItemProperties(
                        titleSecond
                          ? { ...item.properties, _extraTitle: titleSecond }
                          : item.properties
                      )
                    }}
                  />
                ) : null}

                {bundlePackages && (
                  <p className={styles.lineItem__bundleQuantity}>
                    {getLocaleString(
                      bundlePackages.length === 1
                        ? 'snippets.react_cart.bundle_count_one'
                        : 'snippets.react_cart.bundle_count_other',
                      {
                        replacements: {
                          count: String(bundlePackages.length)
                        }
                      }
                    )}
                  </p>
                )}
              </div>

              {bundlePackages && (
                <button
                  className={styles.lineItem__bundleExpand}
                  type="button"
                  onClick={() => {
                    setIsBundleExpanded(!isBundleExpanded)
                  }}
                  aria-expanded={isBundleExpanded}
                  data-tvg-track="button_click"
                  data-tvg-track-label={
                    isBundleExpanded
                      ? 'Collapse bundle items'
                      : 'Expand bundle items'
                  }
                  aria-label={
                    isBundleExpanded
                      ? 'Collapse bundle items'
                      : 'Expand bundle items'
                  }
                >
                  {isBundleExpanded ? <IconMinus /> : <IconPlus />}
                </button>
              )}

              {lineItemHasLineLevelDiscount(item) &&
              item.discounts &&
              item.discounts.length > 0 ? (
                <LineItemDiscounts item={item} />
              ) : null}
            </div>

            {bundlePackages && isBundleExpanded && (
              <div className={styles.lineItem__bundleProducts}>
                {bundlePackages.map((bundleItem) => {
                  const [bundleItemTitleFirst, bundleItemTitleSecond] =
                    bundleItem.productTitle
                      ?.split('|')
                      .map((part) => part.trim()) ?? []
                  return (
                    <div
                      key={bundleItem.id}
                      className={styles.lineItem__bundleProduct}
                    >
                      {bundleItem.image && (
                        <div className={styles.lineItem__bundleProductImage}>
                          <img
                            src={bundleItem.image}
                            alt={bundleItem.productTitle}
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className={styles.lineItem__bundleProductInfo}>
                        <h3 className={styles.lineItem__bundleProductTitle}>
                          {bundleItemTitleFirst ?? bundleItem.productTitle}
                        </h3>
                        {bundleItemTitleSecond && (
                          <p className={styles.lineItem__bundleProductVariant}>
                            {bundleItemTitleSecond}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LineItem
