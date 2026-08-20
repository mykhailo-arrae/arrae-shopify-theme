import { type FC, useCallback, useEffect, useId, useRef, useState } from 'react'
import { initCart } from '../../../../core/cart-v2/index.js'
import { getLocaleString } from '../../../../core/shopify/get-locale-string.js'
import styles from '../../styles.scss.js'
import type { QuantityProps } from '../io.js'
import { IconMinus, IconPlus } from './icons.js'

const cart = initCart()

const Quantity: FC<QuantityProps> = ({ data }) => {
  const { item } = data
  const minQty = Math.max(1, item.quantity_rule?.min ?? 1)
  const [inputValue, setInputValue] = useState(String(item.quantity))
  const [quantityError, setQuantityError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const requestGenerationRef = useRef(0)
  const inFlightRequestsRef = useRef(0)
  const quantityErrorId = useId()

  useEffect(() => {
    setInputValue(String(item.quantity))
  }, [item.quantity])

  const applyQuantityChange = useCallback(
    async (nextQty: number) => {
      const previousQty = item.quantity
      const getActualQuantity = async (
        refreshFirst: boolean
      ): Promise<number> => {
        if (refreshFirst) {
          try {
            const refreshResult = await cart.sendAsync({
              type: 'RefreshCart',
              payload: null
            })

            if (refreshResult === 'busy') {
              // If refresh cannot run immediately, keep best-effort snapshot fallback.
            }
          } catch {
            // Ignore refresh errors and fall back to current snapshot.
          }
        }

        const line = cart
          .getSnapshot()
          .context.cart?.items.find((i) => i.key === item.key)

        return line?.quantity ?? previousQty
      }

      if (nextQty > 0 && nextQty < minQty) {
        return
      }

      if (nextQty === previousQty) {
        return
      }

      const generation = ++requestGenerationRef.current
      inFlightRequestsRef.current += 1
      setIsUpdating(true)

      try {
        const result = await cart.sendAsync({
          type: 'ChangeItems',
          payload: {
            operations: [
              {
                type: 'changeItemQuantity',
                payload: {
                  items: [
                    {
                      lineItemKey: item.key,
                      quantity: nextQty
                    }
                  ]
                }
              }
            ]
          }
        })

        if (generation !== requestGenerationRef.current) {
          return
        }

        if (result === 'busy') {
          return
        }

        const actual = await getActualQuantity(false)

        setInputValue(String(actual))

        if (nextQty > previousQty && actual < nextQty) {
          setQuantityError(
            getLocaleString('snippets.react_cart.quantity_stock_limited', {
              replacements: { count: String(actual) }
            })
          )
        } else {
          setQuantityError(null)
        }
      } catch (err: unknown) {
        const actual = await getActualQuantity(true)
        console.error(err)

        setInputValue(String(actual))

        if (nextQty > previousQty && actual < nextQty) {
          setQuantityError(
            getLocaleString('snippets.react_cart.quantity_stock_limited', {
              replacements: { count: String(actual) }
            })
          )
        }
      } finally {
        inFlightRequestsRef.current -= 1
        if (inFlightRequestsRef.current <= 0) {
          inFlightRequestsRef.current = 0
          setIsUpdating(false)
        }
      }
    },
    [item.key, item.quantity, minQty]
  )

  const changeQuantity = useCallback(
    (change: number) => {
      void applyQuantityChange(item.quantity + change)
    },
    [applyQuantityChange, item.quantity]
  )

  const setQuantity = useCallback(
    (quantity: number) => {
      const clamped = Math.max(minQty, Math.floor(quantity))
      void applyQuantityChange(clamped)
    },
    [applyQuantityChange, minQty]
  )

  const commitInput = useCallback(() => {
    const parsed = Number.parseInt(inputValue, 10)
    if (Number.isNaN(parsed) || parsed < minQty) {
      setInputValue(String(item.quantity))
      setQuantityError(null)
      return
    }
    setQuantity(parsed)
  }, [inputValue, item.quantity, minQty, setQuantity])

  const handleDecrementClick = useCallback(() => {
    const q = item.quantity
    const nextQty = q <= minQty ? 0 : q - 1
    void applyQuantityChange(nextQty)
  }, [applyQuantityChange, item.quantity, minQty])

  const handleIncrementClick = useCallback(() => {
    changeQuantity(1)
  }, [changeQuantity])

  return (
    <>
      <div className={styles.quantity}>
        <div className={styles.quantity__controls}>
          <button
            onClick={handleDecrementClick}
            type="button"
            disabled={isUpdating}
            aria-label={getLocaleString(
              'snippets.react_cart.decrease_quantity'
            )}
            className={styles.quantity__control}
            data-tvg-track="button_click"
            data-tvg-track-label={getLocaleString(
              'snippets.react_cart.decrease_quantity'
            )}
          >
            <IconMinus />
          </button>
          <input
            value={inputValue}
            type="text"
            inputMode="numeric"
            disabled={isUpdating}
            aria-label={`${getLocaleString('snippets.react_cart.quantity')}: ${inputValue}`}
            aria-invalid={quantityError != null}
            aria-describedby={
              quantityError != null ? quantityErrorId : undefined
            }
            className={styles.quantity__input}
            onChange={(e) => {
              setInputValue(e.target.value)
              setQuantityError(null)
            }}
            onBlur={commitInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
          />
          <button
            onClick={handleIncrementClick}
            type="button"
            disabled={isUpdating}
            aria-label={getLocaleString(
              'snippets.react_cart.increase_quantity'
            )}
            className={styles.quantity__control}
            data-tvg-track="button_click"
            data-tvg-track-label={getLocaleString(
              'snippets.react_cart.increase_quantity'
            )}
          >
            <IconPlus />
          </button>
        </div>
      </div>

      {quantityError != null ? (
        <p id={quantityErrorId} className={styles.quantity__error} role="alert">
          {quantityError}
        </p>
      ) : null}
    </>
  )
}

export default Quantity
