export type NonEmptyArray<T> = [T, ...T[]]

/**
 * Converts an array into a non-empty array by ensuring the first element is not null or undefined.
 *
 * @returns A non-empty array with the first element guaranteed to be non-nullable.
 * @throws If the array is empty or the first element is null or undefined.
 */
export const asNonEmptyArray = <T>(array: T[]): [NonNullable<T>, ...T[]] => {
  const [firstItem, ...rest] = array

  if (firstItem == null) {
    throw new Error('Array is empty')
  }

  return [firstItem, ...rest]
}
