import test from 'ava'
import { ZodError } from 'devops-zod4'
import { Integer } from './integer.js'

const macro = test.macro<[number | string, number]>({
  exec: async (t, input, expected) => {
    const actual = Integer.parse(input)
    t.is(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} as ${typeof input} ${providedTitle}`.trim()
  }
})

test(macro, 1, 1)
test(macro, 2, 2)
test(macro, 3, 3)
test(macro, -1, -1)
test(macro, 100, 100)
test(macro, -100, -100)
test(macro, '1', 1)
test(macro, '-1', -1)
test(macro, '100', 100)
test(macro, '-100', -100)
test('should handle irrelevant float notation', macro, 1.0, 1)
test('should handle irrelevant float notation', macro, -1.0, -1)
test('should handle irrelevant float notation', macro, '1.0', 1)
test('should handle irrelevant float notation', macro, '-1.0', -1)

const errMacro = test.macro<[unknown, RegExp]>({
  exec: async (t, input, message) => {
    t.throws(
      () => {
        return Integer.parse(input)
      },
      {
        message,
        instanceOf: ZodError
      }
    )
  },
  title: (providedTitle = '', input) => {
    return `given invalid value ${JSON.stringify(input)} as ${typeof input} ${providedTitle}`.trim()
  }
})

test(errMacro, 1.3, /received number/i)
test(errMacro, '1.3', /received number/i)
test(errMacro, null, /received null/i)
test(errMacro, undefined, /received undefined/i)
test(errMacro, { id: 1 }, /received object/i)
test(errMacro, 'abc', /expected an integer/i)
