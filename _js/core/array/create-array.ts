/**
 * Creates an array of a specified size with elements initialized by a callback function.
 *
 * @param size - The desired length of the array (0-999,999)
 * @param initializer - Callback function invoked for each index to generate the element value
 * @returns An array of inferred type T[] with length `size`, or an empty array if size is invalid
 *
 * @throws {Error} When size exceeds 999,999 to prevent memory issues
 *
 * @example
 * // Create an array of sequential numbers
 * createArray(5, (i) => i); // [0, 1, 2, 3, 4]
 * createArray(5, (i) => i + 1); // [1, 2, 3, 4, 5]
 *
 * @example
 * // Create an array of objects
 * createArray(3, (i) => ({ id: i, name: `Item ${i}` }));
 * // [{ id: 0, name: 'Item 0' }, { id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }]
 *
 * @example
 * // Invalid size returns empty array
 * createArray(-1, (i) => i); // []
 * createArray(NaN, (i) => i); // []
 */
export const createArray = <T>(
  size: number,
  initializer: (index: number) => T
): T[] => {
  if (Number.isNaN(size) || size < 0) {
    return []
  }

  if (size > 999_999) {
    throw new Error('Size is too large')
  }

  return Array.from({ length: size }, (_, i) => initializer(i))
}
