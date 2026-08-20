import test from 'ava'
import type { JSONValue } from './json-value.js'

test('should accept valid JSON values', (t) => {
  null satisfies JSONValue
  'string' satisfies JSONValue
  42 satisfies JSONValue
  true satisfies JSONValue
  ;({ key: 'value' }) satisfies JSONValue
  ;[1, 2, 3] satisfies JSONValue
  ;({ nested: { key: 'value' } }) satisfies JSONValue
  ;[{ array: 'of objects' }] satisfies JSONValue

  t.pass()
})

test('should reject invalid JSON values', (t) => {
  // @ts-expect-error - not a JSON Value
  undefined satisfies JSONValue
  // @ts-expect-error - not a JSON Value
  ;(() => {
    return true
  }) satisfies JSONValue
  // @ts-expect-error - not a JSON Value
  Symbol('symbol') satisfies JSONValue
  // @ts-expect-error - not a JSON Value
  new Map() satisfies JSONValue
  // @ts-expect-error - not a JSON Value
  new Set() satisfies JSONValue
  // @ts-expect-error - not a JSON Value
  new Date() satisfies JSONValue

  t.pass()
})
