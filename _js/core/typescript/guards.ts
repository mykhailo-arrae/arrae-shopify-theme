export const isPresent = <T>(t: T | undefined | null): t is T => {
  return t !== undefined && t !== null
}

export const isDefined = <T>(t: T | undefined): t is T => {
  return t !== undefined
}

export const isNotNull = <T>(t: T | null): t is T => {
  return t !== null
}
