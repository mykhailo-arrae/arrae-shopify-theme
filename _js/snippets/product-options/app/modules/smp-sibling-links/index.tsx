import clsx from 'clsx'
import type { FC, FocusEvent, MouseEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { initMainBus } from '../../../../../core/messaging/main/index.js'
import { getLocaleString } from '../../../../../core/shopify/get-locale-string.js'
import { kebabCase } from '../../../../../core/string/kebab-case.js'
import { prefetchQuickshopProduct } from '../../../../../sections/quickshop/helpers.js'
import type { SmpSiblingOption } from '../../io.js'
import { checkLocksmithAccess } from './check-locksmith-access.js'
import styles from './style.module.scss'
import {
  isPrimaryUnmodifiedClick,
  prefetchSmpSiblingProduct,
  swapSmpSiblingProduct
} from './swap-smp-sibling-product.js'

export type Props = {
  selectorLabel: string
  productTitle: string
  smpSiblingOptions: SmpSiblingOption[]
}

const isInsideQuickshop = (element: Element): boolean => {
  return element.closest('[data-quickshop]') != null
}

export const SmpSiblingLinks: FC<Props> = ({
  selectorLabel,
  productTitle,
  smpSiblingOptions
}) => {
  const mainBus = initMainBus()

  const currentOption =
    smpSiblingOptions.find((option) => option.isCurrentProduct) ??
    smpSiblingOptions[0]

  const titleSelection = currentOption?.displayLabel ?? ''
  const titleDescription = currentOption?.description ?? ''

  const titlePrefix =
    selectorLabel.trim().length > 0
      ? selectorLabel.trim()
      : getLocaleString(
          'products.product.product_options.select_flavor_prefix',
          {
            replacements: {
              product: productTitle
            },
            fallback: `Select ${productTitle}:`
          }
        )

  // Non-current siblings may be locked (e.g. an unreleased product gated
  // behind a Locksmith password). Never render, prefetch, or swap into one
  // until Locksmith's Storefront API confirms this visitor has access —
  // the raw product fetch used for the swap does not reliably reflect lock
  // state on its own, so this check is the source of truth.
  const otherOptionUrls = useMemo(
    () =>
      smpSiblingOptions
        .filter((option) => !option.isCurrentProduct)
        .map((option) => option.url),
    [smpSiblingOptions]
  )

  const [accessByUrl, setAccessByUrl] = useState<Map<string, boolean> | null>(
    otherOptionUrls.length === 0 ? new Map() : null
  )

  useEffect(() => {
    if (otherOptionUrls.length === 0) {
      setAccessByUrl(new Map())
      return
    }

    let cancelled = false

    void checkLocksmithAccess(otherOptionUrls).then((map) => {
      if (!cancelled) {
        setAccessByUrl(map)
      }
    })

    return () => {
      cancelled = true
    }
  }, [otherOptionUrls])

  const visibleOptions = smpSiblingOptions.filter((option) => {
    if (option.isCurrentProduct) {
      return true
    }
    // While the access check is in flight (accessByUrl == null), hide —
    // never show a locked sibling link, even briefly.
    return accessByUrl?.get(option.url) === true
  })

  const handlePrefetch = (
    event: MouseEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>,
    url: string
  ): void => {
    if (isInsideQuickshop(event.currentTarget)) {
      void prefetchQuickshopProduct(url)
      return
    }
    prefetchSmpSiblingProduct(url, event.currentTarget)
  }

  const handleClick = (
    event: MouseEvent<HTMLAnchorElement>,
    url: string
  ): void => {
    // Preserve open-in-new-tab / middle-click / modified clicks as real navigations.
    if (!isPrimaryUnmodifiedClick(event)) {
      return
    }

    event.preventDefault()

    // In the quickshop drawer, swap buy-box content in place instead of the PDP
    // product-main swap (or fallback navigation when product-main is absent).
    if (isInsideQuickshop(event.currentTarget)) {
      mainBus.send({
        name: 'request:open-quickshop-drawer',
        details: { productUrl: url, replaceInPlace: true },
        source: { type: 'global' }
      })
      return
    }

    void swapSmpSiblingProduct({
      url,
      sourceElement: event.currentTarget,
      pushHistory: true,
      fallbackNavigate: true
    })
  }

  return (
    <div className={styles.SmpSiblingLinks}>
      <h5 className={styles['SmpSiblingLinks-title']}>
        {titlePrefix}{' '}
        <span className={styles['SmpSiblingLinks-titleSelection']}>
          {titleSelection}
        </span>
        {titleDescription.trim().length > 0 ? (
          <span className={styles['SmpSiblingLinks-titleDescription']}>
            {' '}
            ({titleDescription})
          </span>
        ) : null}
      </h5>

      <div
        className={styles['SmpSiblingLinks-list']}
        role="list"
        aria-label={titlePrefix}
      >
        {visibleOptions.map((option) => {
          const itemClass = clsx(styles['SmpSiblingLinks-item'], {
            [styles['SmpSiblingLinks-item--current']]: option.isCurrentProduct
          })

          const content = (
            <>
              <span
                className={clsx(
                  styles['SmpSiblingLinks-indicator'],
                  option.useSwatchImageSize
                    ? styles['SmpSiblingLinks-indicator--useSwatchImageSize']
                    : null
                )}
                style={
                  option.swatchHex != null && option.swatchHex.length > 0
                    ? { backgroundColor: option.swatchHex }
                    : undefined
                }
                aria-hidden="true"
              >
                {option.imageUrl != null && option.imageUrl.length > 0 ? (
                  <img
                    className={styles['SmpSiblingLinks-indicatorImage']}
                    src={option.imageUrl}
                    alt=""
                    loading="lazy"
                  />
                ) : null}
              </span>
              <span className={styles['SmpSiblingLinks-label']}>
                {option.displayLabel}
              </span>
              {option.badge.trim().length > 0 ? (
                <span className={styles['SmpSiblingLinks-badge']}>
                  {option.badge}
                </span>
              ) : null}
            </>
          )

          if (option.isCurrentProduct) {
            return (
              <span
                key={kebabCase(`smp-${option.productId}`)}
                className={itemClass}
                role="listitem"
                aria-current="true"
              >
                {content}
              </span>
            )
          }

          return (
            <a
              key={kebabCase(`smp-${option.productId}`)}
              href={option.url}
              className={itemClass}
              role="listitem"
              onClick={(event) => {
                handleClick(event, option.url)
              }}
              onMouseEnter={(event) => {
                handlePrefetch(event, option.url)
              }}
              onFocus={(event) => {
                handlePrefetch(event, option.url)
              }}
            >
              {content}
            </a>
          )
        })}
      </div>
    </div>
  )
}
