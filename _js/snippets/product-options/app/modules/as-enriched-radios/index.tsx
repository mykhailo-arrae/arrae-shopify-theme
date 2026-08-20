import clsx from 'clsx'
import type { ChangeEvent, FC } from 'react'
import { useMemo, useState } from 'react'
import { formatMoneyTrimmed } from '../../../../../core/shopify/format-money.js'
import { getLocaleString } from '../../../../../core/shopify/get-locale-string.js'
import type { SellingPlansGroup } from '../../../../../core/shopify/schemas/product.js'
import type { ProductVariant } from '../../../../../core/shopify/schemas/product-variant.js'
import { kebabCase } from '../../../../../core/string/kebab-case.js'
import { genUid } from '../../../../../core/uid/index.js'
import { getPurchaseTypeDisplayLabel } from '../../composite-options/composite-display.js'
import { resolveOptionValueVariant } from '../../composite-options/resolve-option-value-variant.js'
import type { OptionsLayout, VariantDisplay } from '../../io.js'
import { isPurchaseTypeOption } from '../../variant-display/purchase-type-option.js'
import {
  getPricePerServing,
  getSavingsLabel,
  getVariantPrices,
  isSubscriptionVariant,
  parseSubscriptionBenefits
} from '../../variant-display/variant-option-helpers.js'
import type { OptionValueGroup } from '../filter-options/index.js'
import type { Action } from '../select-variant/index.js'
import styles from './style.module.scss'

export type Props = {
  optionNames: string[]
  optionValueGroups: OptionValueGroup[]
  variants: ProductVariant[]
  variantDisplay: VariantDisplay[]
  optionsLayout: OptionsLayout
  sellingPlanGroups?: SellingPlansGroup
  subscriptionBenefits?: string | null
  moneyFormat: string
  dispatch: (action: Action) => void
  focusedOptionIndex: number
  focusOnIndex: (index: number) => void
  selectedOptionValue?: string | null
  productTitle?: string
  optionValuePrefix?: string | null
}

export const ProductOptionsAsEnrichedRadios: FC<Props> = ({
  optionNames,
  optionValueGroups,
  variants,
  variantDisplay,
  optionsLayout,
  sellingPlanGroups,
  subscriptionBenefits,
  moneyFormat,
  dispatch,
  focusedOptionIndex,
  focusOnIndex,
  selectedOptionValue = null,
  productTitle = '',
  optionValuePrefix = null
}) => {
  const [uid] = useState<string>(genUid)

  const variantDisplayById = useMemo(
    () => new Map(variantDisplay.map((entry) => [entry.variantId, entry])),
    [variantDisplay]
  )

  const benefits = useMemo(
    () => parseSubscriptionBenefits(subscriptionBenefits),
    [subscriptionBenefits]
  )

  const getVariantDisplay = (variant: ProductVariant | undefined) => {
    return variant ? variantDisplayById.get(variant.id) : undefined
  }

  const displayContext = useMemo(
    () => ({
      productTitle,
      optionValuePrefix
    }),
    [optionValuePrefix, productTitle]
  )

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
    <div className={styles.ProductRadioButtons}>
      {optionNames.map((optionName, optionIndex) => {
        const optionGroup = optionValueGroups[optionIndex]

        if (optionGroup == null) {
          return null
        }

        const isPurchaseType = isPurchaseTypeOption(optionName)

        const titleClass = clsx(styles['ProductRadioButtons-groupTitle'], {
          [styles['ProductRadioButtons-groupTitle--focused']]:
            optionIndex === focusedOptionIndex
        })

        const groupTitleId = kebabCase(`${uid}-${optionName}-title`)

        const displayedOptionValues = [...optionGroup].reverse()

        const bestValueOptionName =
          displayedOptionValues.find((optionValue) => {
            if (optionValue.status === 'unavailable') {
              return false
            }

            const candidateVariant = resolveOptionValueVariant({
              variants,
              optionIndex,
              value: optionValue.name,
              optionsLayout,
              selectedOptionValue
            })

            if (
              candidateVariant == null ||
              candidateVariant.available === false
            ) {
              return false
            }

            const candidateDisplay = getVariantDisplay(candidateVariant)

            if (!isSubscriptionVariant(candidateVariant, candidateDisplay)) {
              return false
            }

            const candidateSavings = getSavingsLabel(
              candidateVariant,
              candidateDisplay,
              sellingPlanGroups
            )

            return candidateSavings != null && candidateSavings.length > 0
          })?.name ?? null

        return (
          <div
            key={kebabCase(uid + optionName)}
            className={styles['ProductRadioButtons-group']}
          >
            {!isPurchaseType ? (
              <h5 id={groupTitleId} className={titleClass}>
                {optionName}
              </h5>
            ) : null}

            <div
              className={styles['ProductRadioButtons-list']}
              role="radiogroup"
              {...(isPurchaseType
                ? { 'aria-label': optionName }
                : { 'aria-labelledby': groupTitleId })}
            >
              {displayedOptionValues.map((optionValue) => {
                const { status } = optionValue
                const variant = resolveOptionValueVariant({
                  variants,
                  optionIndex,
                  value: optionValue.name,
                  optionsLayout,
                  selectedOptionValue
                })
                const display = getVariantDisplay(variant)
                const displayLabel = getPurchaseTypeDisplayLabel(
                  optionValue.name,
                  displayContext
                )
                const name = kebabCase(`${uid}-${optionName}`)
                const id = kebabCase(`${name}-${optionValue.name}`)
                const checked = status === 'selected'
                const isUnavailable = status === 'unavailable'
                const isSoldOut = variant != null && variant.available === false
                const isSubscription = isSubscriptionVariant(variant, display)
                const savingsLabel = isSoldOut
                  ? null
                  : getSavingsLabel(variant, display, sellingPlanGroups)
                const showSubscriptionBenefits =
                  checked && isSubscription && !isSoldOut && benefits.length > 0
                const { displayPrice, compareAtPrice } =
                  variant != null
                    ? getVariantPrices(variant, sellingPlanGroups, display)
                    : { displayPrice: 0, compareAtPrice: null }
                const pricePerServing = getPricePerServing(
                  displayPrice,
                  display?.numberOfServings
                )
                const pricePerServingLabel =
                  pricePerServing != null
                    ? getLocaleString(
                        'products.product.product_options.price_per_serving',
                        {
                          replacements: {
                            price: formatMoneyTrimmed(
                              pricePerServing,
                              moneyFormat
                            )
                          },
                          fallback: `${formatMoneyTrimmed(pricePerServing, moneyFormat)} / Serving`
                        }
                      )
                    : null
                const additionalInformation =
                  display?.subscriptionAdditionalInformation?.trim() ?? ''
                const isBestValue = optionValue.name === bestValueOptionName

                const itemClass = clsx(styles['ProductRadioButtons-item'], {
                  [styles['ProductRadioButtons-item--selected']]:
                    checked && !isSoldOut,
                  [styles['ProductRadioButtons-item--selectedSoldOut']]:
                    checked && isSoldOut,
                  [styles['ProductRadioButtons-item--unavailable']]:
                    isUnavailable,
                  [styles['ProductRadioButtons-item--outOfStock']]: isSoldOut
                })

                const handleFocus = () => {
                  focusOnIndex(optionIndex)
                }

                const handleClick = () => {
                  focusOnIndex(optionIndex)
                }

                const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
                  handleChange(optionName, e.currentTarget.value)
                }

                return (
                  <div key={id} className={itemClass}>
                    <input
                      id={id}
                      name={name}
                      type="radio"
                      className={styles['ProductRadioButtons-itemInput']}
                      value={optionValue.name}
                      checked={checked}
                      onFocus={handleFocus}
                      onClick={handleClick}
                      onChange={handleInput}
                      disabled={isUnavailable}
                    />
                    <label
                      htmlFor={id}
                      className={styles['ProductRadioButtons-itemLabel']}
                    >
                      {checked &&
                      !isSoldOut &&
                      isSubscription &&
                      savingsLabel != null &&
                      savingsLabel.length > 0 ? (
                        <div
                          className={styles['ProductRadioButtons-itemHeader']}
                        >
                          {isBestValue ? (
                            <span
                              className={
                                styles[
                                  'ProductRadioButtons-itemHeaderBestValue'
                                ]
                              }
                            >
                              {getLocaleString(
                                'products.product.product_options.best_value',
                                { fallback: 'Best Value' }
                              )}{' '}
                            </span>
                          ) : null}
                          {savingsLabel}
                        </div>
                      ) : null}

                      <div className={styles['ProductRadioButtons-itemBody']}>
                        <div className={styles['ProductRadioButtons-itemInfo']}>
                          <span
                            className={
                              styles['ProductRadioButtons-itemRadioIndicator']
                            }
                            aria-hidden="true"
                          />
                          <div
                            className={styles['ProductRadioButtons-itemText']}
                          >
                            <span
                              className={
                                styles['ProductRadioButtons-itemTitle']
                              }
                            >
                              {displayLabel}
                            </span>
                            {!isSoldOut && additionalInformation.length > 0 ? (
                              <span
                                className={
                                  styles[
                                    'ProductRadioButtons-itemAdditionalInfo'
                                  ]
                                }
                              >
                                {additionalInformation}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {!checked &&
                        !isSoldOut &&
                        isSubscription &&
                        savingsLabel != null &&
                        savingsLabel.length > 0 ? (
                          <span
                            className={styles['ProductRadioButtons-itemBadge']}
                          >
                            {savingsLabel}
                          </span>
                        ) : null}

                        {variant != null ? (
                          isSoldOut ? (
                            <span
                              className={
                                styles['ProductRadioButtons-itemSoldOut']
                              }
                            >
                              {getLocaleString('products.product.sold_out', {
                                fallback: 'Sold Out'
                              })}
                            </span>
                          ) : (
                            <div
                              className={
                                styles['ProductRadioButtons-itemPricing']
                              }
                            >
                              <span
                                className={
                                  styles['ProductRadioButtons-itemPriceGroup']
                                }
                              >
                                <span
                                  className={
                                    styles['ProductRadioButtons-itemPrice']
                                  }
                                >
                                  {formatMoneyTrimmed(
                                    displayPrice,
                                    moneyFormat
                                  )}
                                </span>
                                {compareAtPrice != null ? (
                                  <s
                                    className={
                                      styles[
                                        'ProductRadioButtons-itemCompareAt'
                                      ]
                                    }
                                  >
                                    {formatMoneyTrimmed(
                                      compareAtPrice,
                                      moneyFormat
                                    )}
                                  </s>
                                ) : null}
                              </span>
                              {pricePerServingLabel != null ? (
                                <span
                                  className={
                                    styles['ProductRadioButtons-itemServings']
                                  }
                                >
                                  {pricePerServingLabel}
                                </span>
                              ) : null}
                            </div>
                          )
                        ) : null}
                      </div>

                      {isSubscription && !isSoldOut && benefits.length > 0 ? (
                        <div
                          className={clsx(
                            styles['ProductRadioButtons-itemBenefitsWrapper'],
                            {
                              [styles[
                                'ProductRadioButtons-itemBenefitsWrapper--expanded'
                              ]]: showSubscriptionBenefits
                            }
                          )}
                          aria-hidden={!showSubscriptionBenefits}
                        >
                          <div
                            className={
                              styles['ProductRadioButtons-itemBenefitsInner']
                            }
                          >
                            <div
                              className={
                                styles['ProductRadioButtons-itemBenefits']
                              }
                            >
                              <span
                                className={
                                  styles[
                                    'ProductRadioButtons-itemBenefitsLabel'
                                  ]
                                }
                              >
                                {getLocaleString(
                                  'products.product.product_options.subscription_benefits'
                                )}
                              </span>
                              <ul
                                className={
                                  styles['ProductRadioButtons-itemBenefitsList']
                                }
                                role="list"
                              >
                                {benefits.map((benefit) => (
                                  <li
                                    key={benefit}
                                    className={
                                      styles[
                                        'ProductRadioButtons-itemBenefitsItem'
                                      ]
                                    }
                                  >
                                    <svg
                                      className={
                                        styles[
                                          'ProductRadioButtons-itemBenefitsIcon'
                                        ]
                                      }
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="14"
                                      height="14"
                                      viewBox="0 0 14 14"
                                      fill="none"
                                      aria-hidden="true"
                                      focusable="false"
                                    >
                                      <path
                                        d="M5.16552 11.5L1.83301 8.24172L2.34779 7.73841L5.16552 10.4934L12.3182 3.5L12.833 4.00331L5.16552 11.5Z"
                                        fill="currentColor"
                                      />
                                    </svg>
                                    <span>{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ) : null}
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

// Backward-compatible export until all imports are updated.
export const ProductOptionsAsRadioButtons = ProductOptionsAsEnrichedRadios
