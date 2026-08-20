/**
 * Ensures the key and value types propagate to the result array
 */
export const entries = <
  T extends Record<PropertyKey, unknown>,
  K extends keyof T,
  V extends T[K]
>(
  o: T
): [K, V][] => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return Object.entries(o) as [K, V][]
}
