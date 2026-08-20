export const DEFAULT_COMPOSITE_DELIMITER = ' | '

export type ParsedCompositeValue = {
  flavor: string
  purchaseType: string
  isComposite: boolean
}

const normalizePart = (value: string): string => value.trim()

export const hasCompositeDelimiter = (value: string): boolean => {
  return value.includes('|')
}

export const parseCompositeValue = (
  value: string,
  delimiter: string = DEFAULT_COMPOSITE_DELIMITER
): ParsedCompositeValue => {
  const normalizedDelimiter = delimiter.includes('|')
    ? delimiter
    : DEFAULT_COMPOSITE_DELIMITER

  if (!hasCompositeDelimiter(value)) {
    return {
      flavor: normalizePart(value),
      purchaseType: normalizePart(value),
      isComposite: false
    }
  }

  const delimiterIndex = value.includes(normalizedDelimiter)
    ? value.indexOf(normalizedDelimiter)
    : value.indexOf('|')

  if (delimiterIndex === -1) {
    return {
      flavor: normalizePart(value),
      purchaseType: normalizePart(value),
      isComposite: false
    }
  }

  const delimiterLength = value.includes(normalizedDelimiter)
    ? normalizedDelimiter.length
    : 1
  const flavor = normalizePart(value.slice(0, delimiterIndex))
  const purchaseType = normalizePart(
    value.slice(delimiterIndex + delimiterLength)
  )

  return {
    flavor,
    purchaseType,
    isComposite: flavor.length > 0 && purchaseType.length > 0
  }
}

export const composeCompositeValue = (
  flavor: string,
  purchaseType: string,
  delimiter: string = DEFAULT_COMPOSITE_DELIMITER
): string => {
  return `${normalizePart(flavor)}${delimiter}${normalizePart(purchaseType)}`
}
