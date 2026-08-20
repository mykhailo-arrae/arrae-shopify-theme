import clsx from 'clsx'
import type React from 'react'
import { atShopifyRoot } from '../../../../core/network/shopify-root.js'
import styles from '../../styles.scss.js'
import { useCartContext } from '../context.js'

type EmptyProps = {
  /** When upsell renders below, avoid filling the full cart height. */
  hasUpsellBelow?: boolean
}

const Empty: React.FC<EmptyProps> = ({ hasUpsellBelow = false }) => {
  const { state } = useCartContext()
  const { empty_cart, layout } = state.data

  return (
    <div
      className={clsx(
        styles.empty,
        hasUpsellBelow && styles['empty--withUpsell']
      )}
    >
      <div className={styles.empty__container}>
        {empty_cart.title && (
          <span className={styles.empty__title}>{empty_cart.title}</span>
        )}
        <div className={styles.empty__actions}>
          {layout === 'page' ? (
            <a
              className={styles.empty__button}
              href={atShopifyRoot(
                empty_cart.cta_primary_link ?? '/'
              ).toString()}
            >
              <span className={styles.empty__buttonText}>
                {empty_cart.cta_primary_text}
              </span>
            </a>
          ) : (
            <a
              className={clsx(styles.empty__button, 'js-offcanvas-close')}
              href={atShopifyRoot(
                empty_cart.cta_primary_link ?? '/'
              ).toString()}
              data-tvg-track="button_click"
              data-tvg-track-label={empty_cart.cta_primary_text}
            >
              <span className={styles.empty__buttonText}>
                {empty_cart.cta_primary_text}
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default Empty
