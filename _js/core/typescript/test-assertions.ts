/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */

/**
 * Let Typescript evaluate the types in the function, but don't run the function
 */
export const doNotRun = <F extends () => unknown>(_: F): F => {
  return typeof _ !== 'undefined' ? _ : _
}

export type Expect<T extends true> = T

export type Unite<T> =
  T extends Record<string, unknown> ? { [Key in keyof T]: T[Key] } : T

export type StrictEqual<A1, A2> =
  (<A>() => A extends A2 ? true : false) extends <A>() => A extends A1
    ? true
    : false
    ? true
    : false

export type Equal<A1, A2> = StrictEqual<Unite<A1>, Unite<A2>>
