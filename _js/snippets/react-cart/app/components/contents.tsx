import type React from 'react'
import { useMemo } from 'react'
import type { CartItem } from '../../../../core/cart-v2/blueprints/cart/item.js'
import styles from '../../styles.scss.js'
import { useCartContext } from '../context.js'
import { sortCartItemsWithFreeGiftsLast } from '../helpers.js'
import LineItem from './line-item.js'

type ContentsProps = {
  items: CartItem[]
}

const Contents: React.FC<ContentsProps> = ({ items }) => {
  const { state } = useCartContext()
  const { market, cart_product_variants: cartProductVariants } = state.data
  const sortedItems = useMemo(
    () => sortCartItemsWithFreeGiftsLast(items),
    [items]
  )

  return (
    <div className={styles.contents__wrapper}>
      {sortedItems.map((item) => {
        const productVariants =
          cartProductVariants?.find(
            (entry) => entry.product_id === item.product_id
          ) ?? null
        return (
          <LineItem
            key={item.key}
            data={{
              item,
              handle: item.handle ?? '',
              money_format: market?.money_format ?? '',
              productVariants
            }}
          />
        )
      })}
    </div>
  )
}

export default Contents
