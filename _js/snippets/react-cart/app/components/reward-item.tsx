import type { FC } from 'react'
import { initCart } from '../../../../core/cart-v2/index.js'
import { initMainBus } from '../../../../core/messaging/main/index.js'
import { formatMoney } from '../../../../core/shopify/format-money.js'
import { getLocaleString } from '../../../../core/shopify/get-locale-string.js'
import type { Product } from '../../../../core/shopify/schemas/product.js'
import style from '../../styles.scss.js'
import { useCartContext } from '../context.js'
import { getTierRewardId } from '../helpers.js'
import type { CartRewardItem } from '../io.js'

const cart = initCart()
const mainMessageBus = initMainBus()

type RewardItemProps = {
  product: Product
  tier: CartRewardItem
}

export const RewardItem: FC<RewardItemProps> = ({ product, tier }) => {
  const { state } = useCartContext()

  const handleSubmit = async () => {
    const tierId = getTierRewardId(tier)
    const compoundId = `${tierId}:${product.id}`
    const firstAvailableVariant =
      product.variants.find((v) => v.available) || product.variants[0]

    const variantId = firstAvailableVariant?.id
    if (!variantId || variantId < 1) {
      console.error('No variant for reward product', product.handle)
      return
    }

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
        console.warn('Cart is busy, cannot add reward at the moment')
        return
      }

      mainMessageBus.send({
        name: 'core:cart:update',
        details: null,
        source: { type: 'global' }
      })
    } catch (err) {
      console.error('Add to cart failed', err)
    }
  }

  return (
    <div className={style.reward} data-handle={product.handle}>
      <div className={style.reward__wrapper}>
        <div className={style.reward__images}>
          {product?.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.title}
              className={style.reward__image}
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </div>

        <div className={style.reward__content} data-price={product.price}>
          <h3 className={style.reward__title}>{product?.title}</h3>

          {product.price > 0 ? (
            product.compare_at_price &&
            product.compare_at_price > product.price ? (
              <div className={style.reward__price}>
                <span className={style.reward__priceCompare}>
                  {formatMoney(
                    product.compare_at_price,
                    state.data.market?.money_format
                  )}
                </span>
                <span>
                  {formatMoney(product.price, state.data.market?.money_format)}
                </span>
              </div>
            ) : (
              <span className={style.reward__price}>
                {formatMoney(product.price, state.data.market?.money_format)}
              </span>
            )
          ) : (
            <span className={style.reward__price}>
              {getLocaleString('snippets.react_cart.free')}
            </span>
          )}
        </div>
        <button
          type="button"
          className={style.reward__atc}
          onClick={() => handleSubmit()}
        >
          <span>
            {getLocaleString('snippets.react_cart.free_products_button')}
          </span>
        </button>
      </div>
    </div>
  )
}

export default RewardItem
