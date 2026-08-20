import { type FC, type FormEvent, useCallback, useState } from 'react'
import { initCart } from '../../../../core/cart-v2/index.js'
import { useCartState } from '../../../../core/cart-v2/react.js'
import { getLocaleString } from '../../../../core/shopify/get-locale-string.js'
import styles from '../../styles.scss.js'

const cart = initCart()

const DiscountCodeInput: FC = () => {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const isCartBusy = useCartState((_, s) => s !== 'Ready' && s !== 'Idle')

  const trimmedValue = value.trim()
  const isApplyDisabled = trimmedValue.length === 0 || isApplying || isCartBusy

  const handleApply = useCallback(async () => {
    const code = trimmedValue
    if (!code || isApplying || isCartBusy) {
      return
    }

    setError(null)
    setIsApplying(true)

    const result = await cart.sendAsync({
      type: 'ApplyDiscounts',
      payload: { add: [code], remove: [] }
    })

    setIsApplying(false)

    if (result === 'busy') {
      return
    }

    const appliedCode = cart
      .getSnapshot()
      .context.cart?.discount_codes.find(
        (discountCode) => discountCode.code.toLowerCase() === code.toLowerCase()
      )

    if (!appliedCode || appliedCode.applicable === false) {
      setError(getLocaleString('snippets.react_cart.discount_code_invalid'))
      return
    }

    setValue('')
  }, [isApplying, isCartBusy, trimmedValue])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void handleApply()
    },
    [handleApply]
  )

  return (
    <form
      className={styles.discountCodeInput}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className={styles.discountCodeInput__row}>
        <label className={styles.discountCodeInput__field}>
          <span className={styles.discountCodeInput__visuallyHidden}>
            {getLocaleString('snippets.react_cart.discount_code_label')}
          </span>
          <input
            type="text"
            name="discount"
            autoComplete="off"
            className={styles.discountCodeInput__input}
            placeholder={getLocaleString(
              'snippets.react_cart.discount_code_placeholder'
            )}
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              if (error) {
                setError(null)
              }
            }}
            disabled={isApplying || isCartBusy}
          />
        </label>
        <button
          type="submit"
          className={styles.discountCodeInput__button}
          disabled={isApplyDisabled}
        >
          {getLocaleString('snippets.react_cart.discount_code_apply')}
        </button>
      </div>
      {error ? (
        <p className={styles.discountCodeInput__error} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}

export default DiscountCodeInput
