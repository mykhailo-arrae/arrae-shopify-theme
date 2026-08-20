import type React from 'react'
import { useMemo } from 'react'
import { useCartState } from '../../../../core/cart-v2/react.js'
import { formatMoney } from '../../../../core/shopify/format-money.js'
import styles from '../../styles.scss.js'
import {
  computeCartTotalForRewards,
  getRewardTiersForCart,
  getTierValue
} from '../helpers.js'
import {
  getSegmentGridTemplateColumns,
  getSegmentProgress
} from '../hooks/use-progress.js'
import type { CartDataProps } from '../io.js'
import { AutoGwpNotice } from './auto-gwp-notice.js'
import Loading from './loading.js'

/**
 * Spend progress toward cart reward **tiers** (free shipping, GWP, etc. as
 * configured in theme rewards JSON). The bar fills based on
 * {@link getSegmentProgress}; tier thresholds use {@link getTierValue}, so each segment should stay visually aligned with
 * when tier benefits unlock—including gift-with-purchase once the customer
 * reaches the configured minimum.
 *
 * **Total used for the bar (`cartTotalForRewards`)**
 *
 * - Sums line amounts from the live cart. Excludes lines that do not
 *   {@link lineItemCountsTowardRewardSpend} (tier gifts, protection SKUs, etc.).
 * - `include_discounts_in_rewards`: when true, sum `final_line_price` and scale by
 *   `cart.total_price` / `items_subtotal_price` when needed. When false, sum
 *   `original_line_price` only (no scaling — avoids mixing in post-discount totals).
 *
 * **Tiers**
 *
 * - Same tier subset as useRewards: {@link getRewardTiersForCart} (enabled, sorted by threshold, max 3).
 * - All header copy comes from theme settings: per-tier `text_before_reward_met` /
 *   `text_after_reward_met`, and `all_tiers_met_text` when every tier is unlocked.
 *   {@link renderSubtitle} adds `reward-tier` / `is-met` / `is-unmet` for theme richtext styling.
 *
 * **DOM hooks**
 *
 * - `data-threshold`: comma-separated tier thresholds in **cents** (same as {@link getTierValue}), for analytics/scripts.
 * - `data-market`: market ISO code from cart JSON.
 */
const AMOUNT_REGEX = /\[\s*amount\s*\]/gi

/** HTML comes from theme settings JSON (trusted); only `[amount]` is substituted. */
const replaceAmountInHtml = (
  html: string,
  amountCents: number,
  moneyFormat: string
): string => html.replace(AMOUNT_REGEX, formatMoney(amountCents, moneyFormat))

const renderThemeRewardHtml = (
  html: string,
  remainingCents: number,
  moneyFormat: string,
  className: string,
  towardNext: boolean
) => (
  <span
    className={className}
    data-all-met={towardNext ? 'false' : 'true'}
    // biome-ignore lint/security/noDangerouslySetInnerHtml: Theme reward richtext from settings JSON
    dangerouslySetInnerHTML={{
      __html: replaceAmountInHtml(html, remainingCents, moneyFormat)
    }}
  />
)

/** Subtitle richtext + [amount] → remaining spend; `towardNext` = still climbing toward a tier. */
const renderSubtitle = (
  html: string,
  remainingCents: number,
  towardNext: boolean,
  moneyFormat: string
) =>
  html.trim() ? (
    <span className={styles.progress__subtitle}>
      {renderThemeRewardHtml(
        html,
        remainingCents,
        moneyFormat,
        `reward-tier ${towardNext ? 'is-unmet' : 'is-met'}`,
        towardNext
      )}
    </span>
  ) : null

const renderPartialMetHeader = (
  metTierHtml: string,
  nextTierHtml: string,
  remainingCents: number,
  moneyFormat: string
) => {
  const metPart = metTierHtml.trim()
  const nextPart = nextTierHtml.trim()

  if (!metPart && !nextPart) {
    return null
  }

  return (
    <span className={styles.progress__subtitle}>
      {metPart ? (
        <span
          className={styles.progress__subtitleMet}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Theme reward richtext from settings JSON
          dangerouslySetInnerHTML={{
            __html: replaceAmountInHtml(metPart, remainingCents, moneyFormat)
          }}
        />
      ) : null}
      {metPart && nextPart ? ' ' : null}
      {nextPart ? (
        <span
          className={styles.progress__subtitleRemaining}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Theme reward richtext from settings JSON
          dangerouslySetInnerHTML={{
            __html: replaceAmountInHtml(nextPart, remainingCents, moneyFormat)
          }}
        />
      ) : null}
    </span>
  )
}

type ProgressProps = CartDataProps & {
  autoGwpError?: string | null
}

const Progress: React.FC<ProgressProps> = ({ data, autoGwpError = null }) => {
  const cartItems = useCartState((c) => c.cart?.items ?? [])
  const cartTotalPrice = useCartState((c) => c.cart?.total_price ?? 0)
  const itemsSubtotalPrice = useCartState(
    (c) => c.cart?.items_subtotal_price ?? 0
  )
  const isInitializing = useCartState((_, s) => s === 'Initializing')
  const { market, rewards } = data
  const { include_discounts_in_rewards, all_tiers_met_text } = rewards
  const cartTotalForRewards = computeCartTotalForRewards({
    cartItems,
    cartTotalPrice,
    itemsSubtotalPrice,
    includeDiscountsInRewards: include_discounts_in_rewards
  })

  const tiers = useMemo(
    () => getRewardTiersForCart(rewards.items),
    [rewards.items]
  )
  const segmentProgress = getSegmentProgress(cartTotalForRewards, tiers)
  const segmentGridTemplateColumns = getSegmentGridTemplateColumns(tiers)

  if (isInitializing) {
    return (
      <div className={styles.progress}>
        <Loading />
      </div>
    )
  }

  if (!market || !tiers.length || !tiers.some((t) => getTierValue(t) > 0)) {
    return null
  }

  const nextTier = tiers.find((t) => cartTotalForRewards < getTierValue(t))
  const lastTier = tiers[tiers.length - 1]!
  const towardNextTier = Boolean(nextTier)
  const lastMetTier = [...tiers]
    .reverse()
    .find((t) => cartTotalForRewards >= getTierValue(t))

  const remainingAmountCents = nextTier
    ? Math.max(getTierValue(nextTier) - cartTotalForRewards, 0)
    : 0

  const renderHeader = () => {
    if (!nextTier) {
      const allMetText =
        tiers.length > 1
          ? (all_tiers_met_text ?? lastTier.text_after_reward_met ?? '')
          : (lastTier.text_after_reward_met ?? '')

      return renderSubtitle(
        allMetText,
        remainingAmountCents,
        false,
        market.money_format
      )
    }

    if (lastMetTier) {
      const metTierHtml = lastMetTier.text_after_reward_met ?? ''
      const nextTierHtml = nextTier.text_before_reward_met ?? ''

      const partialHeader = renderPartialMetHeader(
        metTierHtml,
        nextTierHtml,
        remainingAmountCents,
        market.money_format
      )

      if (partialHeader) {
        return partialHeader
      }
    }

    const subtitleHtml = nextTier.text_before_reward_met ?? ''

    return renderSubtitle(
      subtitleHtml,
      remainingAmountCents,
      towardNextTier,
      market.money_format
    )
  }

  return (
    <div
      className={styles.progress}
      role="region"
      aria-label="Cart rewards progress"
      data-market={market?.iso_code}
      data-threshold={tiers.map((t) => getTierValue(t)).join(',')}
    >
      <div className={styles.progress__header} aria-live="polite">
        {renderHeader()}
      </div>
      <div
        className={styles.progress__segments}
        style={{ gridTemplateColumns: segmentGridTemplateColumns }}
      >
        {tiers.map((tier, index) => {
          const { percent, isMet } = segmentProgress[index] ?? {
            percent: 0,
            isMet: false
          }
          const thresholdCents = getTierValue(tier)
          const formattedThreshold = formatMoney(
            thresholdCents,
            market.money_format
          ).replace('.00', '')

          return (
            <div
              key={`${tier.handle}-${thresholdCents}`}
              className={`${styles.progress__segment} ${isMet ? 'is-met' : ''}`}
            >
              <div
                className={styles.progress__bar}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percent)}
                aria-label={
                  tier.title
                    ? `${tier.title}: Progress toward next reward`
                    : 'Progress toward next reward'
                }
              >
                <div
                  style={{ width: `${percent}%` }}
                  className={styles.progress__percent}
                />
              </div>
              <div
                className={`${styles.progress__segmentLabels} ${isMet ? styles['progress__segmentLabels--hidden'] : ''}`}
                {...(isMet ? { 'aria-hidden': true } : {})}
              >
                {tier.title ? (
                  <span className={styles.progress__segmentTitle}>
                    {tier.title}
                  </span>
                ) : null}
                <span className={styles.progress__segmentThreshold}>
                  Spend {formattedThreshold}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <AutoGwpNotice message={autoGwpError} />
    </div>
  )
}

export default Progress
