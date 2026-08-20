import test from 'ava'
import { _makeInferMaxConcurrency as c, type Predicate } from './concurrency.js'

const macro = test.macro<
  [{ totalCores: number; predicate: Predicate }, number]
>({
  exec: async (t, { totalCores, predicate }, expected) => {
    const actual = c(totalCores)(predicate)
    t.is(actual, expected)
  },
  title: (providedTitle = '', { totalCores, predicate }) => {
    return `given ${totalCores} / ${predicate.toString()} ${providedTitle}`.trim()
  }
})

test(macro, { totalCores: 4, predicate: (t) => t - 1 }, 3)
test(
  'should not go lower than 2 cores',
  macro,
  { totalCores: 4, predicate: (t) => t - 3 },
  2
)
test(
  'should not go lower than 2 cores',
  macro,
  { totalCores: 2, predicate: (t) => t - 3 },
  2
)

test(
  'should not go higher than the total number of cores',
  macro,
  { totalCores: 4, predicate: (t) => t + 1 },
  4
)

test(macro, { totalCores: 8, predicate: (t) => t / 2 }, 4)
test(
  'should floor-round result',
  macro,
  { totalCores: 10, predicate: (t) => t / 3 },
  3
)
