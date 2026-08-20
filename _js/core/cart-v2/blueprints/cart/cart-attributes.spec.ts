import test from 'ava'
import { CartAttributes } from './index.js'

const macro = test.macro<[CartAttributes, CartAttributes]>({
  exec: (t, input, expected) => {
    const actual = CartAttributes.parse(input)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(
  macro,
  { a: null, b: 1, c: '1', d: [null, 1, '1'] },
  { a: null, b: 1, c: '1', d: [null, 1, '1'] }
)
