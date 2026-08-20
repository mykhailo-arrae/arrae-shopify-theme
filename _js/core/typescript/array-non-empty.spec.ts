import test from 'ava'
import { z } from 'zod'
import { asNonEmptyArray, type NonEmptyArray } from './array.js'
import type { Equal } from './test-assertions.js'

test(`given Zod non-empty array type`, async (t) => {
  const List = z.array(z.string()).nonempty()

  t.deepEqual(List.parse(['a']), ['a'])

  t.throws(
    () => {
      List.parse([])
    },
    { message: /at least 1 element/i }
  )

  t.true(
    true satisfies Equal<z.infer<typeof List>, NonEmptyArray<string>>,
    'should be compatible'
  )
})

test(`given non-empty array`, async (t) => {
  const array: NonEmptyArray<number> = [1, 2, 3]

  t.not(array[0], undefined)
  t.is(array[0], 1)

  t.deepEqual(asNonEmptyArray(array), [1, 2, 3])
})

test(`given array with nullish values`, async (t) => {
  t.deepEqual(asNonEmptyArray([1, undefined, 3]), [1, undefined, 3])

  t.deepEqual(asNonEmptyArray([1, null, 3]), [1, null, 3])

  t.throws(
    () => {
      asNonEmptyArray([null, 2, 3])
    },
    { message: /is empty/i }
  )

  t.throws(
    () => {
      asNonEmptyArray([undefined, 2, 3])
    },
    { message: /is empty/i }
  )
})
