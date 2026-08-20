import { coerce, type Infer, integer, number, string, union } from 'superstruct'

export const Integer = coerce(
  integer(),
  union([string(), number()]),
  (value) => (typeof value === 'string' ? Number.parseInt(value, 10) : value)
)

export type Integer = Infer<typeof Integer>
