import test from 'ava'
import { createArray } from './create-array.js'

const macro = test.macro<[Parameters<typeof createArray>, unknown[]]>({
  exec: (t, input, expected) => {
    const actual = createArray(...input)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', [_size, initializer]) => {
    const size =
      _size === Number.NEGATIVE_INFINITY
        ? 'NEGATIVE_INFINITY'
        : _size === Number.POSITIVE_INFINITY
          ? 'POSITIVE_INFINITY'
          : Number.isNaN(_size)
            ? 'NaN'
            : _size

    return `given ${JSON.stringify(size)} ${JSON.stringify(initializer.toString())} ${providedTitle}`.trim()
  }
})

test(macro, [1, () => 'a'], ['a'])
test(macro, [2, () => 'a'], ['a', 'a'])
test(macro, [3, () => 'a'], ['a', 'a', 'a'])

test(macro, [3, (i) => i], [0, 1, 2])
test(macro, [3, (i) => i + 1], [1, 2, 3])
test(macro, [3, (i) => `key-${i + 1}`], ['key-1', 'key-2', 'key-3'])

test(macro, [0, () => 'a'], [])
test(macro, [-1, () => 'a'], [])
test(macro, [Number.MIN_SAFE_INTEGER, () => 'a'], [])
test(macro, [Number.MIN_VALUE, () => 'a'], [])
test(macro, [Number.NEGATIVE_INFINITY, () => 'a'], [])
test(macro, [Number.NaN, () => 'a'], [])

test('should throw if size is too large', (t) => {
  t.throws(() => createArray(1_000_000, () => 'a'), { message: /too large/i })
})
