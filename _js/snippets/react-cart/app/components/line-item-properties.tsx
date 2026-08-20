import { type FC, useMemo } from 'react'
import type {
  CartItem,
  OptionWithValue
} from '../../../../core/cart-v2/blueprints/cart/item.js'
import styles from '../../styles.scss.js'

type Property = {
  key: string
  value: string
}

type LineItemPropertiesProps = {
  item: CartItem
}

const shouldDisplayProperty = (key: string, value?: string): boolean => {
  const isDefaultKey =
    (key.startsWith('_') && key !== '_extraTitle') || /default/i.test(key)
  const isDefaultValue = value ? /default/i.test(value) : false
  // Hide giftnote properties (displayed separately in GiftMessageDisplay)
  const isGiftnoteProperty = key.startsWith('giftnote_')
  return !isDefaultKey && !isDefaultValue && !isGiftnoteProperty
}

const LineItemProperties: FC<LineItemPropertiesProps> = ({ item }) => {
  const { properties, options_with_values } = item

  const mergedProperties = useMemo(() => {
    const propertyMap = new Map<string, Property>()

    options_with_values?.forEach(({ name, value }: OptionWithValue) => {
      if (name && shouldDisplayProperty(name, value)) {
        const key = name.toLowerCase()
        propertyMap.set(key, {
          key: name,
          value: String(value)
        })
      }
    })

    if (properties) {
      Object.entries(properties).forEach(([propKey, propValue]) => {
        if (shouldDisplayProperty(propKey, String(propValue))) {
          const keyLower = propKey.toLowerCase()
          propertyMap.set(keyLower, {
            key: propKey,
            value: String(propValue)
          })
        }
      })
    }

    const items = Array.from(propertyMap.values())

    return items
  }, [properties, options_with_values])

  if (mergedProperties.length === 0) {
    return null
  }

  return (
    <div className={styles.lineItem__properties}>
      {mergedProperties.map(({ key, value }, index) => {
        return (
          <span key={key}>
            {index !== 0 && <span>{`/`}</span>}
            {value}
          </span>
        )
      })}
    </div>
  )
}

export default LineItemProperties
