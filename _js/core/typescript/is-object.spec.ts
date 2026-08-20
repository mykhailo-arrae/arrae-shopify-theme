import test from 'ava'
import { isObject } from './is-object.js'

test('given primitives', (t) => {
  t.is(isObject([]), true)
  t.is(isObject({}), true)
  t.is(isObject(null), false)
  t.is(isObject(undefined), false)
  t.is(isObject(true), false)
  t.is(isObject(false), false)
  t.is(isObject(0), false)
  t.is(isObject(1), false)
  t.is(isObject(''), false)
  t.is(isObject('a'), false)
  t.is(
    isObject(() => null),
    false
  )
})

test('given constructors', (t) => {
  t.is(isObject(new Date()), true)
  t.is(isObject(new Error()), true)
  t.is(isObject(new Object()), true)
  t.is(isObject(new String('a')), true)
  t.is(isObject(new Number(1)), true)
  t.is(isObject(new Boolean(true)), true)
  t.is(isObject(Array.from({ length: 1 })), true)
  t.is(isObject(new Object(1)), true)
  t.is(isObject(new String('a')), true)
  t.is(isObject(new Number(1)), true)
  t.is(isObject(new Boolean(true)), true)
})
