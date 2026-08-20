import test from 'ava'
import { unreachable } from './unreachable.js'

test('given exhaustive ternary expression', (t) => {
  const transform = (input: 'a' | 'b'): 'x' | 'y' | null => {
    return input === 'a' ? 'x' : input === 'b' ? 'y' : unreachable(input, null)
  }

  t.is(transform('a'), 'x')
  t.is(transform('b'), 'y')
})

test('given non-exhaustive ternary expression', (t) => {
  const check = (input: 'a' | 'b'): 'x' | 'y' | null => {
    // @ts-expect-error The expression is not exhaustive
    return input === 'a' ? 'x' : unreachable(input, null)
  }

  t.is(check('a'), 'x')
  t.is(check('b'), null)

  // @ts-expect-error The expression is not exhaustive
  t.is(check('c'), null)
})
