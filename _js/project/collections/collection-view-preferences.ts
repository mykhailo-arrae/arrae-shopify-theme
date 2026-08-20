/**
 * Collection view preferences stored in localStorage
 * For this project it uses only mobile gridLayout, but this can be extended
 * to include widgetView or any other preferences in the future.
 */

const STORAGE_KEY = 'tvg-collection-view-preferences'

export type CollectionViewPreferences = {
  gridLayout: '1-column' | '2-column'
}

const DEFAULT_PREFERENCES: CollectionViewPreferences = {
  gridLayout: '2-column'
}

/**
 * Retrieves collection view preferences from localStorage.
 * @returns {CollectionViewPreferences} User's view preferences, or defaults if none found
 */
export const getCollectionViewPreferences = (): CollectionViewPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return DEFAULT_PREFERENCES
    }
    const parsed = JSON.parse(stored)
    // Validate the structure
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'gridLayout' in parsed
    ) {
      const gridLayout = parsed.gridLayout

      if (gridLayout === '1-column' || gridLayout === '2-column') {
        return {
          gridLayout
        }
      }
    }
    return DEFAULT_PREFERENCES
  } catch {
    return DEFAULT_PREFERENCES
  }
}

/**
 * Saves collection view preferences to localStorage.
 * @param {Partial<CollectionViewPreferences>} preferences - The preferences to save
 * @returns {CollectionViewPreferences} Updated preferences
 */
export const saveCollectionViewPreferences = (
  preferences: Partial<CollectionViewPreferences>
): CollectionViewPreferences => {
  const current = getCollectionViewPreferences()
  const updated: CollectionViewPreferences = {
    ...current,
    ...preferences
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Silently fail if localStorage is not available
  }
  return updated
}
