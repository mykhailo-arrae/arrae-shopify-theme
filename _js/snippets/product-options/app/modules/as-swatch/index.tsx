import clsx from 'clsx'
import type { ChangeEvent, FC } from 'react'
import { useState } from 'react'
import { kebabCase } from '../../../../../core/string/kebab-case.js'
import { genUid } from '../../../../../core/uid/index.js'
import type { BundleSwatchOption } from '../../composite-options/build-bundle-dimensions.js'
import styles from './style.module.scss'

export type Props = {
  title: string
  options: BundleSwatchOption[]
  selectedValue: string
  onSelect: (value: string) => void
}

export const ProductOptionsAsSwatch: FC<Props> = ({
  title,
  options,
  selectedValue,
  onSelect
}) => {
  const [uid] = useState<string>(genUid)
  const groupName = kebabCase(`${uid}-swatch`)

  const selectedOption = options.find(
    (option) => option.value === selectedValue
  )
  const titleSelection = selectedOption?.label ?? ''
  const titleDescription = selectedOption?.description ?? ''

  return (
    <div className={styles.OptionSwatches}>
      <h5 className={styles['OptionSwatches-title']}>
        {title}:
        {titleSelection.length > 0 ? (
          <>
            {' '}
            <span className={styles['OptionSwatches-titleSelection']}>
              {titleSelection}
            </span>
          </>
        ) : null}
        {titleDescription.trim().length > 0 ? (
          <span className={styles['OptionSwatches-titleDescription']}>
            {' '}
            ({titleDescription})
          </span>
        ) : null}
      </h5>

      <div
        className={styles['OptionSwatches-list']}
        role="radiogroup"
        aria-label={title}
      >
        {options.map((option) => {
          const id = kebabCase(`${groupName}-${option.value}`)
          const checked = option.value === selectedValue
          const isUnavailable = option.status === 'unavailable'
          const isSoldOut = option.status === 'out-of-stock'

          const itemClass = clsx(styles['OptionSwatches-item'], {
            [styles['OptionSwatches-item--selected']]: checked,
            [styles['OptionSwatches-item--unavailable']]: isUnavailable,
            [styles['OptionSwatches-item--outOfStock']]: isSoldOut
          })

          const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
            onSelect(event.currentTarget.value)
          }

          return (
            <label key={id} htmlFor={id} className={itemClass}>
              <input
                id={id}
                name={groupName}
                type="radio"
                className={styles['OptionSwatches-itemInput']}
                value={option.value}
                checked={checked}
                disabled={isUnavailable}
                onChange={handleChange}
                aria-checked={checked}
                aria-disabled={isUnavailable}
              />
              <span
                className={styles['OptionSwatches-indicator']}
                style={
                  option.swatchHex != null && option.swatchHex.length > 0
                    ? { backgroundColor: option.swatchHex }
                    : undefined
                }
                aria-hidden="true"
              >
                {option.imageUrl != null && option.imageUrl.length > 0 ? (
                  <img
                    className={styles['OptionSwatches-indicatorImage']}
                    src={option.imageUrl}
                    alt=""
                    loading="lazy"
                  />
                ) : null}
              </span>
              <span className={styles['OptionSwatches-label']}>
                {option.label}
              </span>
              {option.badge.trim().length > 0 ? (
                <span className={styles['OptionSwatches-badge']}>
                  {option.badge}
                </span>
              ) : null}
            </label>
          )
        })}
      </div>
    </div>
  )
}
