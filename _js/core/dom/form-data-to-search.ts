/**
 * Convert form data (FormData) into a search string
 *
 * The search string doesn't include the starting `?` symbol.
 */
export const convertFormDataToSearch = (dataRaw: FormData): string => {
  const data = [...dataRaw.entries()]

  return data
    .flatMap(
      // Bun.js/Node.js global types simplify the FormData entry to a string tuple
      // So we have to treat the value as unknown and narrow it down manually
      ([key, value]: [string, unknown]) => {
        if (typeof value !== 'string') {
          return []
        }

        return [`${encodeURIComponent(key)}=${encodeURIComponent(value)}`]
      }
    )
    .join('&')
}
