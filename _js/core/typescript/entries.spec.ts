import test from 'ava'
import { entries } from './entries.js'
import type { Equal, Expect } from './test-assertions.js'

test(`should return an array of typed key/values`, async (t) => {
  const input = { a: 1, b: '2', c: null }
  const actual = entries(input)
  const expected = [
    ['a', 1],
    ['b', '2'],
    ['c', null]
  ]

  t.deepEqual(actual, expected)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type tests = [
    Expect<Equal<typeof actual, ['a' | 'b' | 'c', string | number | null][]>>
  ]
})
