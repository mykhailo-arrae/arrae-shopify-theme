import clsx from 'clsx'
import type { ChangeEvent, FC } from 'react'
import { useState } from 'react'
import { getLocaleString } from '../../../../../core/shopify/get-locale-string.js'
import { kebabCase } from '../../../../../core/string/kebab-case.js'
import { genUid } from '../../../../../core/uid/index.js'
import type { OptionValueGroup } from '../filter-options/index.js'
import type { Action } from '../select-variant/index.js'
import styles from './style.module.scss'

export type Props = {
  optionNames: string[]
  optionValueGroups: OptionValueGroup[]
  dispatch: (action: Action) => void
  focusedOptionIndex: number
  focusOnIndex: (index: number) => void
  optionIndexOffset?: number
}

export const ProductOptionsAsRadios: FC<Props> = ({
  optionNames,
  optionValueGroups,
  dispatch,
  focusedOptionIndex,
  focusOnIndex,
  optionIndexOffset = 0
}) => {
  const [uid] = useState<string>(genUid)

  const handleChange = (optionName: string, value: string) => {
    dispatch({
      type: 'SelectOptions',
      payload: [
        {
          name: optionName,
          value
        }
      ]
    })
  }

  return (
    <div className={styles.ProductRadios}>
      {optionNames.map((optionName, localOptionIndex) => {
        const optionIndex = optionIndexOffset + localOptionIndex
        const optionGroup = optionValueGroups[localOptionIndex]

        if (optionGroup == null) {
          return null
        }

        const titleClass = clsx(styles['ProductRadios-groupTitle'], {
          [styles['ProductRadios-groupTitle--focused']]:
            optionIndex === focusedOptionIndex
        })

        const soldOutLabel = getLocaleString('products.product.sold_out', {
          fallback: 'Sold out'
        })

        return (
          <div
            key={kebabCase(uid + optionName)}
            className={styles['ProductRadios-group']}
          >
            <h5 className={titleClass}>{optionName}</h5>

            <div className={styles['ProductRadios-list']}>
              {optionGroup.map((optionValue) => {
                const { status } = optionValue
                const name = kebabCase(`${uid}-${optionName}`)
                const id = kebabCase(`${name}-${optionValue.name}`)
                const checked = status === 'selected'
                const isUnavailable = status === 'unavailable'
                const isSoldOut = status === 'out-of-stock'

                const itemClass = clsx(styles['ProductRadios-item'], {
                  [styles['ProductRadios-item--unavailable']]: isUnavailable,
                  [styles['ProductRadios-item--outOfStock']]: isSoldOut
                })

                const handleFocus = () => {
                  focusOnIndex(optionIndex)
                }

                const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
                  handleChange(optionName, event.currentTarget.value)
                }

                return (
                  <div key={id} className={itemClass}>
                    <input
                      id={id}
                      name={name}
                      type="radio"
                      className={styles['ProductRadios-itemInput']}
                      value={optionValue.name}
                      checked={checked}
                      disabled={isUnavailable}
                      onFocus={handleFocus}
                      onClick={handleFocus}
                      onChange={handleInput}
                      aria-checked={checked}
                      aria-disabled={isUnavailable}
                    />
                    <label
                      htmlFor={id}
                      className={styles['ProductRadios-itemLabel']}
                    >
                      {optionValue.name}
                      {isSoldOut ? ` (${soldOutLabel})` : ''}
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
