import test from 'ava'
import { isEmptyObject, isPlainObject } from './is-plain-object.js'

test(`given plain objects`, async (t) => {
  t.is(isPlainObject({}), true)
  t.is(isPlainObject({ message: 'Hello' }), true)
  t.is(isPlainObject({ status: 'ok', message: 'Hello' }), true)
  t.is(isPlainObject(new Object()), true)
  t.is(
    isPlainObject({ constructor: '123' }),
    true,
    'should handle constructor overrides'
  )
})

test(`given arrays`, async (t) => {
  t.is(isPlainObject([]), false)
})

test(`given built-in classes`, async (t) => {
  t.is(isPlainObject(new Error('Hello')), false)
  t.is(isPlainObject(new Date('_')), false)
  t.is(isPlainObject(new Date()), false)
})

test(`given custom classes`, async (t) => {
  class MyClass2 {
    v: string
    constructor() {
      this.v = 'test'
    }
  }
  const myClass2 = new MyClass2()

  t.is(isPlainObject(myClass2), false)

  const mySpecialObject = {}
  Object.setPrototypeOf(mySpecialObject, {
    toDate: () => new Date()
  })

  t.is(isPlainObject(mySpecialObject), false)
})

test(`isEmptyObject type guard`, async (t) => {
  t.is(isEmptyObject({}), true)
  t.is(isEmptyObject({ message: 'Hello' }), false)
  t.is(isEmptyObject({ status: 'ok', message: 'Hello' }), false)
})
