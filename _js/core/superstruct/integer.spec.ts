import test, { type ThrowsExpectation } from 'ava'
import { StructError } from 'superstruct'
import { Integer } from './integer.js'

const macro = test.macro<[number | string, number]>({
  exec: async (t, input, expected) => {
    const actual = Integer.create(input)
    t.is(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${input} as ${typeof input} ${providedTitle}`.trim()
  }
})

test(macro, 1, 1)
test(macro, 2, 2)
test(macro, 3, 3)
test(macro, 100, 100)
test(macro, '1', 1)
test(macro, '100', 100)
test('should discard float part', macro, '1.5', 1)

test('given invalid values', (t) => {
  const expected: ThrowsExpectation<StructError> = {
    message: /expected an integer/i,
    instanceOf: StructError
  }

  t.throws(() => {
    Integer.create('abc')
  }, expected)

  t.throws(() => {
    Integer.create(null)
  }, expected)

  t.throws(() => {
    Integer.create(undefined)
  }, expected)

  t.throws(() => {
    Integer.create({ id: 1 })
  }, expected)
})
