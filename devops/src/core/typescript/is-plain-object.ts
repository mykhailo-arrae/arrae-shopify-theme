export type PlainObject = Record<string | number | symbol, unknown>

/**
 * Returns whether the payload is a plain JavaScript object (excluding special classes or objects with other prototypes)
 */
export const isPlainObject = (payload: unknown): payload is PlainObject => {
  const type = Object.prototype.toString.call(payload).slice(8, -1)

  if (type !== 'Object') {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const prototype = Object.getPrototypeOf(payload)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return prototype.constructor === Object && prototype === Object.prototype
}

/**
 * Returns whether the payload is an empty object (excluding special classes or objects with other prototypes)
 */
export const isEmptyObject = (
  payload: unknown
): payload is Record<string, never> => {
  return isPlainObject(payload) && Object.keys(payload).length === 0
}
