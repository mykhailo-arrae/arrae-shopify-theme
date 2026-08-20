import clsx from 'clsx'
import type { ChangeEvent, FC } from 'react'
import { useMemo, useState } from 'react'
import { formatMoney } from '../../../../../core/shopify/format-money.js'
import { kebabCase } from '../../../../../core/string/kebab-case.js'
import { genUid } from '../../../../../core/uid/index.js'
import type { SellingPlanSettings } from '../../io.js'
import type { SellingPlanGroup } from '../filter-options/index.js'
import { Checkmark } from '../icons/index.js'
import styles from './style.module.scss'

export type SellingPlanOptionAction = {
  type: 'SelectSellingPlan'
  payload: { sellingPlanValue: number | null }
}

export type Props = {
  sellingPlanNames: string[]
  sellingPlans: SellingPlanGroup[]
  sellingPlanId: number | null
  firstSellingPlanId?: number | null
  lastSelectedSellingPlanId?: number | null
  dispatchSellingPlan: (action: SellingPlanOptionAction) => void
  variantPrice: number | null
  moneyFormat: string
  sellingPlanSettings?: SellingPlanSettings
  sellingPlanAfterPrice: number | null
}

export const SellingPlansAsDropdown: FC<Props> = ({
  sellingPlanNames,
  sellingPlans,
  sellingPlanId,
  firstSellingPlanId,
  lastSelectedSellingPlanId,
  dispatchSellingPlan,
  sellingPlanSettings,
  variantPrice,
  sellingPlanAfterPrice,
  moneyFormat
}) => {
  const [uid] = useState<string>(genUid)

  const optionName = sellingPlanNames[0] ?? 'Subscription'
  const optionGroup = sellingPlans[0] ?? []

  const effectiveSellingPlanSelected: number | null =
    sellingPlanId ??
    lastSelectedSellingPlanId ??
    firstSellingPlanId ??
    (optionGroup[0] ? optionGroup[0].id : null)

  const isSubscribe = useMemo<boolean>(() => {
    return sellingPlanId !== null
  }, [sellingPlanId])

  const handleOnetimeChange = () => {
    dispatchSellingPlan({
      type: 'SelectSellingPlan',
      payload: { sellingPlanValue: null }
    })
  }

  const handleSubscribeChange = () => {
    dispatchSellingPlan({
      type: 'SelectSellingPlan',
      payload: { sellingPlanValue: effectiveSellingPlanSelected }
    })
  }

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const valueStr = e.currentTarget.value
    if (valueStr.length === 0) {
      return
    }

    const valueNum = Number(valueStr)
    const nextValue = Number.isNaN(valueNum) ? null : valueNum

    dispatchSellingPlan({
      type: 'SelectSellingPlan',
      payload: { sellingPlanValue: nextValue }
    })
  }

  const selectId = kebabCase(`js-select-${kebabCase(optionName)}-0`)
  const selectName = kebabCase(`${uid}-${optionName}`)

  return (
    <fieldset className={clsx(styles.sellingPlan)}>
      <legend className="u-vhide">Purchase options</legend>

      <div className={styles.sellingPlan__options}>
        {/* Subscribe */}
        <div
          className={styles.sellingPlan__group}
          onClick={handleSubscribeChange}
        >
          <input
            type="radio"
            id="selling-plan-subscribe"
            name="selling-plan"
            className={styles.sellingPlan__input}
            value="subscribe"
            checked={isSubscribe}
            aria-controls="selling-plan-frequency"
            aria-expanded={isSubscribe}
          />

          <div
            className={clsx(
              styles.sellingPlan__checkbox,
              isSubscribe ? 'selected' : null
            )}
            aria-hidden="true"
          >
            <Checkmark />
          </div>

          <label
            className={styles.sellingPlan__label}
            htmlFor="selling-plan-subscribe"
          >
            <span className={styles.sellingPlan__title}>{optionName}</span>
            <div className={styles.sellingPlan__planPrice}>
              {variantPrice && (
                <span
                  className={
                    variantPrice !== null &&
                    sellingPlanAfterPrice !== null &&
                    variantPrice > sellingPlanAfterPrice
                      ? styles.sellingPlan__planPrice__before
                      : undefined
                  }
                >
                  {formatMoney(variantPrice || 0, moneyFormat)}
                </span>
              )}
              {variantPrice !== null &&
                sellingPlanAfterPrice !== null &&
                variantPrice > sellingPlanAfterPrice && (
                  <span>
                    {formatMoney(sellingPlanAfterPrice || 0, moneyFormat)}
                  </span>
                )}
            </div>
          </label>
        </div>

        {/* One-time */}
        <div
          className={styles.sellingPlan__group}
          onClick={handleOnetimeChange}
        >
          <input
            type="radio"
            id="selling-plan-onetime"
            name="selling-plan"
            className={styles.sellingPlan__input}
            value=""
            checked={!isSubscribe}
          />

          <div
            className={clsx(
              styles.sellingPlan__checkbox,
              !isSubscribe ? 'selected' : null
            )}
            aria-hidden="true"
          >
            <Checkmark />
          </div>

          <label
            className={styles.sellingPlan__label}
            htmlFor="selling-plan-onetime"
          >
            <span className={styles.sellingPlan__title}>
              {sellingPlanSettings?.oneTimeLabel || 'Just Once'}
            </span>
            <div className={styles.sellingPlan__price}>
              {formatMoney(variantPrice || 0, moneyFormat)}
            </div>
          </label>
        </div>
      </div>

      {/* Frequency selector only visible when subscribe is active */}
      {isSubscribe && optionGroup.length > 0 && (
        <div
          className={styles.sellingPlan__frequency}
          id="selling-plan-frequency"
          aria-live="polite"
        >
          <div key={selectId + '-select'}>
            <label htmlFor={selectId} className="sr-only">
              {optionName} frequency
            </label>
            <select
              className={styles.sellingPlan__selector}
              id={selectId}
              name={selectName}
              value={effectiveSellingPlanSelected ?? ''}
              onChange={handleSelectChange}
              aria-label={`${optionName} frequency`}
            >
              {optionGroup.map((optionValue) => {
                const optId = kebabCase(`${selectName}-${optionValue.name}`)
                return (
                  <option key={optId} id={optId} value={optionValue.id}>
                    {optionValue.name}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
      )}
    </fieldset>
  )
}
