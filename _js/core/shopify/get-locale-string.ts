import { z } from 'zod'

/**
 * Retrieves a localized string from the theme's locale data (`window.themeLocales`).
 *
 * Supports placeholder replacement using `{{ placeholder }}` syntax and provides
 * fallback values when keys are missing or invalid.
 *
 * @param key - The locale key to look up (e.g., 'cart.items_count')
 * @param options - Optional configuration
 * @param options.replacements - Key-value pairs to replace `{{ placeholder }}` tokens
 * @param options.fallback - Value returned if the key is not found or invalid
 * @returns The localized string with replacements applied, or the fallback value
 *
 * @example
 * // Simple lookup
 * getLocaleString('cart.title')
 *
 * @example
 * // With placeholder replacement (locale: "You have {{ count }} items")
 * getLocaleString('cart.items_count', { replacements: { count: '5' } })
 * // => "You have 5 items"
 *
 * @example
 * // With fallback for missing keys
 * getLocaleString('missing.key', { fallback: 'Default text' })
 * // => "Default text"
 *
 * @example
 * // Combined usage
 * getLocaleString('cart.items_count', {
 *   replacements: { count: '0' },
 *   fallback: 'No items in cart'
 * })
 */

const LocaleReplacementsSchema = z.record(z.string(), z.string())

const AvailableLocaleSchema = z.object({
  name: z.string().optional(),
  getPluralRule: z.unknown().optional()
})

const ThemeLocalesSchema = z
  .object({
    _availableLocales: z.record(z.string(), AvailableLocaleSchema),
    _currentLocale: AvailableLocaleSchema.optional()
  })
  .catchall(z.string())

export type LocaleReplacements = z.infer<typeof LocaleReplacementsSchema>
export type AvailableLocale = z.infer<typeof AvailableLocaleSchema>
export type ThemeLocales = z.infer<typeof ThemeLocalesSchema>

export type GetLocaleStringOptions = {
  replacements?: LocaleReplacements
  fallback?: string
}

export type GetLocaleStringFn = (
  key: string,
  options?: GetLocaleStringOptions
) => string

type CustomWindow = Window & {
  themeLocales?: ThemeLocales
}

declare let window: CustomWindow

let cachedLocales: ThemeLocales | null = null
const decodedCache = new Map<string, string>()
let textAreaElement: HTMLTextAreaElement | null = null

const getValidatedLocales = (): ThemeLocales | null => {
  if (cachedLocales !== null) {
    return cachedLocales
  }

  const result = ThemeLocalesSchema.safeParse(window.themeLocales)
  if (result.success) {
    cachedLocales = result.data
  }

  return cachedLocales
}

const getTextArea = (): HTMLTextAreaElement => {
  if (!textAreaElement) {
    textAreaElement = document.createElement('textarea')
  }
  return textAreaElement
}

const decodeValue = (value: string): string => {
  const cached = decodedCache.get(value)
  if (cached !== undefined) {
    return cached
  }

  const textArea = getTextArea()
  try {
    textArea.innerHTML = decodeURIComponent(value)
  } catch {
    textArea.innerHTML = value
  }
  const decoded = textArea.value
  decodedCache.set(value, decoded)
  return decoded
}

const isValidReplacements = (
  replacements: unknown
): replacements is LocaleReplacements => {
  return LocaleReplacementsSchema.safeParse(replacements).success
}

export const getLocaleString: GetLocaleStringFn = (key, options) => {
  const { replacements, fallback } = options ?? {}

  if (typeof key !== 'string' || key.trim() === '') {
    console.warn('getLocaleString: key must be a non-empty string')
    return fallback ?? ''
  }

  try {
    const locale = getValidatedLocales()
    if (!locale) {
      console.warn('getLocaleString: themeLocales is not available or invalid')
      return fallback ?? ''
    }

    const value = locale[key]
    if (typeof value !== 'string') {
      console.warn(`getLocaleString: no valid string found for key "${key}"`)
      return fallback ?? ''
    }

    let decodedValue = decodeValue(value)

    if (replacements !== undefined) {
      if (!isValidReplacements(replacements)) {
        console.warn(
          'getLocaleString: replacements must be a valid Record<string, string>'
        )
        return decodedValue
      }

      for (const [placeholder, replacement] of Object.entries(replacements)) {
        const regex = new RegExp(
          `{{\\s*${placeholder.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}\\s*}}`,
          'g'
        )
        decodedValue = decodedValue.replace(regex, () => replacement)
      }
    }

    return decodedValue
  } catch (err) {
    console.error(`Error retrieving locale string for key "${key}"`, err)
    return fallback ?? ''
  }
}
