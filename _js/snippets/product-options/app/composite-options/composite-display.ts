import {
  hasCompositeDelimiter,
  parseCompositeValue
} from './parse-composite-value.js'

export type CompositeDisplayContext = {
  productTitle?: string
  optionValuePrefix?: string | null
}

const normalizeComparable = (value: string): string =>
  value.trim().toLowerCase()

/**
 * Strips a redundant product title or configured prefix from the flavor segment
 * of a pipe-encoded option value (e.g. "Bloat" or "Raspberry Yuzu CP+ & Tone").
 */
export const stripCompositeFlavorPrefix = (
  flavorPart: string,
  context?: CompositeDisplayContext
): string => {
  const trimmed = flavorPart.trim()

  if (trimmed.length === 0) {
    return ''
  }

  const productTitle = context?.productTitle?.trim()

  if (
    productTitle != null &&
    productTitle.length > 0 &&
    normalizeComparable(trimmed) === normalizeComparable(productTitle)
  ) {
    return ''
  }

  const prefix = context?.optionValuePrefix?.trim()

  if (
    prefix != null &&
    prefix.length > 0 &&
    trimmed.toLowerCase().startsWith(prefix.toLowerCase())
  ) {
    return trimmed.slice(prefix.length).trim()
  }

  return trimmed
}

/**
 * Human-readable flavor label from the first segment of a composite value.
 * Applies prefix stripping, then optional "Tone " suffix extraction for bundles.
 */
export const extractFlavorDisplayLabel = (
  rawFlavorPart: string,
  context?: CompositeDisplayContext
): string => {
  const stripped = stripCompositeFlavorPrefix(rawFlavorPart, context)

  if (stripped.length === 0) {
    return ''
  }

  const toneMarker = 'Tone '
  const toneIndex = stripped.lastIndexOf(toneMarker)

  if (toneIndex >= 0) {
    return stripped.slice(toneIndex + toneMarker.length).trim()
  }

  return stripped
}

/** Display label for the purchase-type segment (second part after pipe). */
export const getPurchaseTypeDisplayLabel = (
  value: string,
  _context?: CompositeDisplayContext
): string => {
  const parsed = parseCompositeValue(value)

  if (!parsed.isComposite) {
    return value
  }

  return parsed.purchaseType
}

export const getFlavorLabelFromOptionValue = (
  value: string,
  context?: CompositeDisplayContext
): string | null => {
  const parsed = parseCompositeValue(value)

  if (!parsed.isComposite) {
    return null
  }

  const label = extractFlavorDisplayLabel(parsed.flavor, context)

  return label.length > 0 ? label : null
}

export const getDisplayLabelForOptionValue = (
  value: string,
  part: 'flavor' | 'purchaseType' = 'purchaseType',
  context?: CompositeDisplayContext
): string => {
  if (part === 'purchaseType') {
    return getPurchaseTypeDisplayLabel(value, context)
  }

  return getFlavorLabelFromOptionValue(value, context) ?? value
}

export const getCompositeFlavorKey = (value: string): string | null => {
  const parsed = parseCompositeValue(value)

  return parsed.isComposite ? parsed.flavor : null
}

export const variantTitlesShareFlavor = (a: string, b: string): boolean => {
  const keyA = getCompositeFlavorKey(a)
  const keyB = getCompositeFlavorKey(b)

  if (keyA == null || keyB == null) {
    return keyA === keyB
  }

  return normalizeComparable(keyA) === normalizeComparable(keyB)
}

export const filterVariantsBySelectedFlavor = <T extends { title: string }>(
  variants: T[],
  selectedTitle: string | null | undefined
): T[] => {
  if (selectedTitle == null || !hasCompositeDelimiter(selectedTitle)) {
    return variants
  }

  return variants.filter((variant) =>
    variantTitlesShareFlavor(variant.title, selectedTitle)
  )
}
