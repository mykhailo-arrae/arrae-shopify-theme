export const joinNameSegments = (segments: (string | null)[]): string => {
  const result = segments
    .filter((segment) => segment != null && segment.length > 0)
    .join('-')

  if (result.length === 0) {
    throw new Error('Name segments are invalid')
  }

  return result
}
