import type { FC } from 'react'
import type {
  CartItem,
  CartItemDiscount
} from '../../../../core/cart-v2/blueprints/cart/item.js'
import styles from '../../styles.scss.js'

type LineItemDiscountsProps = {
  item: CartItem
}

const hasDiscountTitle = (discount: unknown): discount is { title: string } => {
  return (
    typeof discount === 'object' &&
    discount !== null &&
    'title' in discount &&
    typeof discount.title === 'string'
  )
}

const LineItemDiscounts: FC<LineItemDiscountsProps> = ({ item }) => {
  const { discounts } = item

  return (
    <>
      {discounts?.length > 0 && (
        <div className={styles.lineItem__discounts}>
          {discounts.map((discount: CartItemDiscount, index) => {
            const discountKey = hasDiscountTitle(discount)
              ? discount.title
              : `discount-${index}`
            return (
              <span key={discountKey}>
                {hasDiscountTitle(discount) ? discount.title : null}
              </span>
            )
          })}
        </div>
      )}
    </>
  )
}

export default LineItemDiscounts
