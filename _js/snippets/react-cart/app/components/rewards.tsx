import clsx from 'clsx'
import { type FC, useEffect, useRef } from 'react'
import type { Swiper as SwiperType } from 'swiper'
import { Mousewheel, Navigation, Scrollbar } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import { initMainBus } from '../../../../core/messaging/main/index.js'
import { getLocaleString } from '../../../../core/shopify/get-locale-string.js'
import type { Product } from '../../../../core/shopify/schemas/product.js'
import styles from '../../styles.scss.js'
import { useCartContext, useSharedRewards } from '../context.js'
import { getTierRewardId } from '../helpers.js'
import { IconButtonArrowNext, IconButtonArrowPrev } from './icons.js'
import RewardItem from './reward-item.js'

/**
 * Tier reward (GWP) carousel: shows gift products when the cart qualifies for a
 * spend tier (`handle: "gwp"` in theme rewards JSON). Eligibility is computed in
 * {@link useRewards}; each slide uses {@link RewardItem} (and auto-add uses
 * {@link useAutoGwp}) only when that tier has a single product; otherwise this
 * carousel is the chooser. Each add sends **line item properties** the
 * storefront expects a Shopify Function (e.g. Cart Transform or discount) to
 * read so the line can be treated as free once the tier threshold is met.
 *
 * Properties sent on add-to-cart (same set for manual add and auto GWP):
 *
 * | Property | Purpose |
 * | --- | --- |
 * | `_reward_id` | Numeric tier id from {@link getTierRewardId} (theme `id` or handle fallback). Identifies which reward tier claimed this line. |
 * | `_reward_title` | Tier title for display; optional for Function logic. |
 * | `_product_id` | Shopify product id for the gift. |
 * | `_compound_id` | `${tierId}:${productId}` — unique key per tier + product. |
 * | `_reward_key` | Same value as `_compound_id` (stable key for deduping / matching). |
 * | `_is_free_gift` | `true` — marks the line as a tier gift for zeroing price in the Function. |
 *
 * The Function should validate eligibility (e.g. cart subtotal vs tier minimum)
 * using shop metafields or tier config; these properties identify **which** gift
 * line to adjust, not replace server-side threshold checks.
 */

const mainBus = initMainBus()

export const Rewards: FC = () => {
  const { state } = useCartContext()
  const { rewards, layout } = state.data
  const swiperRef = useRef<SwiperType | null>(null)
  const rewardsNavPrevRef = useRef<HTMLButtonElement | null>(null)
  const rewardsNavNextRef = useRef<HTMLButtonElement | null>(null)
  const rewardsScrollbarRef = useRef<HTMLDivElement | null>(null)
  const { activeTier, hasTierRewards, tierRewards, applicableTiers } =
    useSharedRewards()

  useEffect(() => {
    const updateSwiperAfterCartChange = () => {
      const swiper = swiperRef.current
      if (swiper) {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => swiper.update())
        )
      }
    }
    const offAdded = mainBus
      .on('notification:added-item-to-cart')
      .do(updateSwiperAfterCartChange)
    const offCartUpdate = mainBus
      .on('core:cart:update')
      .do(updateSwiperAfterCartChange)
    return () => {
      offAdded()
      offCartUpdate()
    }
  }, [])

  if (
    !rewards.items.find((item) => item.handle === 'gwp')?.enabled ||
    !hasTierRewards ||
    !tierRewards ||
    !activeTier
  ) {
    return null
  }

  const slideCount = applicableTiers.reduce(
    (n, { products }) => n + products.length,
    0
  )
  const showNav = slideCount > 1
  const prevLabel = getLocaleString(
    'snippets.react_cart.rewards_carousel_previous'
  )
  const nextLabel = getLocaleString('snippets.react_cart.rewards_carousel_next')

  return (
    <div className={styles.rewards}>
      <h3 className={styles.rewards__title}>
        {getLocaleString('snippets.react_cart.free_products_title')}{' '}
        {activeTier?.title}
      </h3>
      <div className={styles.rewards__carousel}>
        <Swiper
          spaceBetween={8}
          freeMode={true}
          simulateTouch={true}
          allowTouchMove={true}
          modules={showNav ? [Scrollbar, Navigation, Mousewheel] : [Mousewheel]}
          navigation={
            showNav
              ? {
                  prevEl: rewardsNavPrevRef.current,
                  nextEl: rewardsNavNextRef.current
                }
              : false
          }
          scrollbar={
            showNav
              ? { el: rewardsScrollbarRef.current, draggable: false }
              : false
          }
          onBeforeInit={(swiper) => {
            if (!showNav) {
              return
            }
            const { navigation: nav, scrollbar: sb } = swiper.params
            if (nav && typeof nav === 'object') {
              nav.prevEl = rewardsNavPrevRef.current
              nav.nextEl = rewardsNavNextRef.current
            }
            if (sb && typeof sb === 'object') {
              sb.el = rewardsScrollbarRef.current
            }
          }}
          mousewheel={{
            enabled: true,
            forceToAxis: true,
            releaseOnEdges: true,
            thresholdDelta: 8
          }}
          slidesPerView={1.5}
          slidesOffsetBefore={16}
          slidesOffsetAfter={16}
          breakpoints={{
            1024: {
              slidesPerView: 1.3,
              slidesOffsetBefore: layout === 'page' ? 0 : 24,
              slidesOffsetAfter: layout === 'page' ? 0 : 24
            }
          }}
          onSwiper={(s) => {
            swiperRef.current = s
            if (showNav) {
              s.navigation.init()
              s.navigation.update()
            }
          }}
        >
          {applicableTiers.map(({ tier, products }) =>
            products.map((product: Product) => (
              <SwiperSlide key={`${getTierRewardId(tier)}-${product.id}`}>
                <RewardItem product={product} tier={tier} />
              </SwiperSlide>
            ))
          )}
        </Swiper>

        {showNav && (
          <div className={styles.rewards__navigation}>
            <div
              ref={rewardsScrollbarRef}
              className={clsx(
                styles.rewards__scrollbar,
                'swiper-scrollbar-horizontal'
              )}
            ></div>
            <div className={styles.rewards__arrows}>
              <button
                ref={rewardsNavPrevRef}
                type="button"
                className={styles.rewards__arrow}
                aria-label={prevLabel}
              >
                <IconButtonArrowPrev />
              </button>
              <button
                ref={rewardsNavNextRef}
                type="button"
                className={styles.rewards__arrow}
                aria-label={nextLabel}
              >
                <IconButtonArrowNext />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Rewards
