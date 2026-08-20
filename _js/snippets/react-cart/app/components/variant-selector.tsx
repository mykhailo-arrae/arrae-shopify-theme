import clsx from 'clsx'
import {
  type FC,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react'
import type { CartItem } from '../../../../core/cart-v2/blueprints/cart/item.js'
import type { CartItemProperties } from '../../../../core/cart-v2/blueprints/cart/item-properties.js'
import { useCartActions } from '../../../../core/cart-v2/react.js'
import { getLocaleString } from '../../../../core/shopify/get-locale-string.js'
import styles from '../../styles.scss.js'
import {
  findVariantOption,
  formatVariantDiscountLabel,
  getCartVariantsForSelectedFlavor,
  getMaxSubscriptionDiscountPercent,
  lineItemHasVariantSelector,
  parseOptionLabel,
  quantityForVariantChange
} from '../helpers.js'
import type { CartProductVariant, CartProductVariants } from '../io.js'
import { IconDropDownArrow } from './icons.js'

export type VariantSelectorProps = {
  item: CartItem
  productVariants: CartProductVariants | null
}

type SelectableOption = {
  optionId: string
  variant: CartProductVariant
  label: string
}

const cleanLineProperties = (
  properties: CartItemProperties | null
): Record<string, string | number | boolean | null> | undefined => {
  if (!properties) {
    return undefined
  }
  const cleaned: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(properties)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      cleaned[key] = value
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined
}

const getSelectedOptionIndex = (
  options: SelectableOption[],
  variantId: number
): number => {
  const index = options.findIndex((opt) => opt.variant.id === variantId)
  return index === -1 ? 0 : index
}

export const VariantSelector: FC<VariantSelectorProps> = ({
  item,
  productVariants
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeOptionIndex, setActiveOptionIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const comboboxRef = useRef<HTMLButtonElement>(null)
  const typeaheadRef = useRef('')
  const typeaheadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cart = useCartActions()
  const labelId = useId()
  const comboboxId = useId()
  const listboxId = useId()
  const optionIdPrefix = useId()

  const selectedVariant = useMemo(
    () => findVariantOption(productVariants, item.variant_id),
    [productVariants, item.variant_id]
  )

  const flavorScopedVariants = useMemo(() => {
    const variants = productVariants?.variants ?? []
    return getCartVariantsForSelectedFlavor(variants, selectedVariant?.title)
  }, [productVariants, selectedVariant?.title])

  const oneTimeVariant = useMemo(
    () =>
      flavorScopedVariants.find((variant) => !variant.has_selling_plan) ?? null,
    [flavorScopedVariants]
  )

  const subscriptionVariants = useMemo(
    () => flavorScopedVariants.filter((variant) => variant.has_selling_plan),
    [flavorScopedVariants]
  )

  const selectableOptions = useMemo((): SelectableOption[] => {
    const options: SelectableOption[] = []
    let index = 0

    if (oneTimeVariant) {
      options.push({
        optionId: `${optionIdPrefix}-option-${index}`,
        variant: oneTimeVariant,
        label: getLocaleString('snippets.react_cart.variant_selector_one_time')
      })
      index += 1
    }

    for (const variant of subscriptionVariants) {
      options.push({
        optionId: `${optionIdPrefix}-option-${index}`,
        variant,
        label: variant.title
      })
      index += 1
    }

    return options
  }, [oneTimeVariant, optionIdPrefix, subscriptionVariants])

  const maxDiscountPercent = useMemo(
    () => getMaxSubscriptionDiscountPercent(productVariants),
    [productVariants]
  )

  const collapsedLabel = useMemo(() => {
    if (selectedVariant?.has_selling_plan) {
      return parseOptionLabel(selectedVariant.title, productVariants)
    }
    if (maxDiscountPercent != null) {
      return getLocaleString('snippets.react_cart.variant_selector_cta', {
        replacements: { percent: String(maxDiscountPercent) }
      })
    }
    return getLocaleString('snippets.react_cart.variant_selector_cta_fallback')
  }, [maxDiscountPercent, productVariants, selectedVariant])

  const selectedOptionIndex = useMemo(
    () => getSelectedOptionIndex(selectableOptions, item.variant_id),
    [item.variant_id, selectableOptions]
  )

  const activeOption = selectableOptions[activeOptionIndex]
  const activeDescendantId = isOpen ? activeOption?.optionId : undefined

  const openListbox = useCallback(() => {
    setActiveOptionIndex(selectedOptionIndex)
    setIsOpen(true)
  }, [selectedOptionIndex])

  const closeListbox = useCallback(() => {
    setIsOpen(false)
    setActiveOptionIndex(selectedOptionIndex)
    typeaheadRef.current = ''
  }, [selectedOptionIndex])

  useEffect(() => {
    if (!isOpen) {
      setActiveOptionIndex(selectedOptionIndex)
    }
  }, [isOpen, selectedOptionIndex])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return
      }
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        closeListbox()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [closeListbox, isOpen])

  useEffect(() => {
    return () => {
      if (typeaheadTimeoutRef.current) {
        clearTimeout(typeaheadTimeoutRef.current)
      }
    }
  }, [])

  const applyVariantChange = useCallback(
    (targetVariant: CartProductVariant) => {
      if (targetVariant.id === item.variant_id || isLoading) {
        closeListbox()
        return
      }

      setIsLoading(true)
      cart
        .sendAsync({
          type: 'ChangeItems',
          payload: {
            operations: [
              {
                type: 'changeItemVariant',
                payload: {
                  items: [
                    {
                      lineItemKey: item.key,
                      variantId: targetVariant.id,
                      sellingPlan: targetVariant.selling_plan_id ?? null,
                      quantity: quantityForVariantChange(
                        targetVariant,
                        item.quantity
                      ),
                      properties: cleanLineProperties(item.properties)
                    }
                  ]
                }
              }
            ]
          }
        })
        .catch((err) => {
          console.error('Error changing line item variant:', err)
        })
        .finally(() => {
          setIsLoading(false)
        })
      closeListbox()
      comboboxRef.current?.focus()
    },
    [
      cart,
      closeListbox,
      isLoading,
      item.key,
      item.properties,
      item.quantity,
      item.variant_id
    ]
  )

  const selectActiveOption = useCallback(() => {
    const option = selectableOptions[activeOptionIndex]
    if (option) {
      applyVariantChange(option.variant)
    }
  }, [activeOptionIndex, applyVariantChange, selectableOptions])

  const moveActiveIndex = useCallback(
    (delta: number) => {
      const count = selectableOptions.length
      if (count === 0) {
        return
      }
      setActiveOptionIndex((current) => (current + delta + count) % count)
    },
    [selectableOptions.length]
  )

  const focusOptionByTypeahead = useCallback(
    (char: string) => {
      const lower = char.toLowerCase()
      const count = selectableOptions.length
      if (count === 0) {
        return
      }

      const start = (activeOptionIndex + 1) % count
      let matchIndex = -1

      for (let i = 0; i < count; i += 1) {
        const index = (start + i) % count
        const option = selectableOptions[index]
        if (option?.label.toLowerCase().startsWith(lower)) {
          matchIndex = index
          break
        }
      }

      if (matchIndex !== -1) {
        setActiveOptionIndex(matchIndex)
      }
    },
    [activeOptionIndex, selectableOptions]
  )

  const handleComboboxKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (isLoading) {
        return
      }

      const { key } = e

      if (!isOpen) {
        if (
          key === 'ArrowDown' ||
          key === 'ArrowUp' ||
          key === 'Enter' ||
          key === ' '
        ) {
          e.preventDefault()
          openListbox()
        }
        return
      }

      switch (key) {
        case 'ArrowDown': {
          e.preventDefault()
          moveActiveIndex(1)
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          moveActiveIndex(-1)
          break
        }
        case 'Home': {
          e.preventDefault()
          setActiveOptionIndex(0)
          break
        }
        case 'End': {
          e.preventDefault()
          setActiveOptionIndex(Math.max(0, selectableOptions.length - 1))
          break
        }
        case 'Enter':
        case ' ': {
          e.preventDefault()
          selectActiveOption()
          break
        }
        case 'Escape': {
          e.preventDefault()
          e.stopPropagation()
          closeListbox()
          break
        }
        case 'Tab': {
          closeListbox()
          break
        }
        default: {
          if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault()
            typeaheadRef.current += key
            focusOptionByTypeahead(key)

            if (typeaheadTimeoutRef.current) {
              clearTimeout(typeaheadTimeoutRef.current)
            }
            typeaheadTimeoutRef.current = setTimeout(() => {
              typeaheadRef.current = ''
            }, 500)
          }
        }
      }
    },
    [
      closeListbox,
      focusOptionByTypeahead,
      isLoading,
      isOpen,
      moveActiveIndex,
      openListbox,
      selectActiveOption,
      selectableOptions.length
    ]
  )

  const handleComboboxClick = useCallback(() => {
    if (isLoading) {
      return
    }
    if (isOpen) {
      closeListbox()
    } else {
      openListbox()
    }
  }, [closeListbox, isLoading, isOpen, openListbox])

  if (!lineItemHasVariantSelector(productVariants)) {
    return null
  }

  const optionCount = selectableOptions.length
  let subscriptionOptionOffset = oneTimeVariant ? 1 : 0

  return (
    <div ref={containerRef} className={styles.lineItem__variantSelector}>
      <span
        id={labelId}
        className={styles.lineItem__variantSelector_visuallyHidden}
      >
        {getLocaleString('snippets.react_cart.variant_selector_aria_label')}
      </span>

      <button
        ref={comboboxRef}
        id={comboboxId}
        type="button"
        role="combobox"
        className={styles.lineItem__variantSelector_trigger}
        aria-labelledby={labelId}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-autocomplete="none"
        aria-activedescendant={activeDescendantId}
        aria-haspopup="listbox"
        aria-busy={isLoading}
        disabled={isLoading}
        onClick={handleComboboxClick}
        onKeyDown={handleComboboxKeyDown}
      >
        <span className={styles.lineItem__variantSelector_triggerLabel}>
          {collapsedLabel}
        </span>
        <span
          className={clsx(styles.lineItem__variantSelector_triggerIcon, {
            [styles.lineItem__variantSelector_triggerIcon__open]: isOpen
          })}
          aria-hidden="true"
        >
          <IconDropDownArrow />
        </span>
      </button>

      <ul
        id={listboxId}
        role="listbox"
        aria-labelledby={labelId}
        hidden={!isOpen}
        className={clsx(styles.lineItem__variantSelector_panel, {
          [styles.lineItem__variantSelector_panel__open]: isOpen
        })}
      >
        <li
          role="presentation"
          className={styles.lineItem__variantSelector_sectionHeader}
          aria-hidden="true"
        >
          {getLocaleString(
            'snippets.react_cart.variant_selector_full_price_header'
          )}
        </li>
        {oneTimeVariant
          ? (() => {
              const option = selectableOptions[0]
              if (!option) {
                return null
              }
              const isSelected = item.variant_id === option.variant.id
              const isActive = activeOptionIndex === 0

              return (
                <li
                  key={option.variant.id}
                  id={option.optionId}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={isLoading}
                  aria-setsize={optionCount}
                  aria-posinset={1}
                  className={clsx(styles.lineItem__variantSelector_option, {
                    [styles.lineItem__variantSelector_option__active]: isActive
                  })}
                  onMouseEnter={() => {
                    setActiveOptionIndex(0)
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                  }}
                  onClick={() => {
                    applyVariantChange(option.variant)
                  }}
                >
                  <span>{option.label}</span>
                </li>
              )
            })()
          : null}

        <li
          role="presentation"
          className={styles.lineItem__variantSelector_sectionHeader}
          aria-hidden="true"
        >
          {getLocaleString(
            'snippets.react_cart.variant_selector_subscribe_header'
          )}
        </li>
        {subscriptionVariants.map((variant, index) => {
          const optionIndex = subscriptionOptionOffset + index
          const option = selectableOptions[optionIndex]
          if (!option) {
            return null
          }

          const discountLabel = formatVariantDiscountLabel(variant)
          const isSelected = item.variant_id === variant.id
          const isActive = activeOptionIndex === optionIndex

          return (
            <li
              key={variant.id}
              id={option.optionId}
              role="option"
              aria-selected={isSelected}
              aria-disabled={isLoading}
              aria-setsize={optionCount}
              aria-posinset={optionIndex + 1}
              className={clsx(styles.lineItem__variantSelector_option, {
                [styles.lineItem__variantSelector_option__active]: isActive
              })}
              onMouseEnter={() => {
                setActiveOptionIndex(optionIndex)
              }}
              onMouseDown={(e) => {
                e.preventDefault()
              }}
              onClick={() => {
                applyVariantChange(variant)
              }}
            >
              <span>{parseOptionLabel(option.label, productVariants)}</span>
              {discountLabel ? (
                <span className={styles.lineItem__variantSelector_optionBadge}>
                  {discountLabel}
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
