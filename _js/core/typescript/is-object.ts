/**
 * Basic object guard. It matches any object, including arrays and classes
 */
export const isObject = <T>(term: T): term is NonNullable<T> => {
  return term !== null && typeof term === 'object'
}
