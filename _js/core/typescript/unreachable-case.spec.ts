import test from 'ava'
import { assertUnreachable, UnreachableCaseError } from './unreachable-case.js'

test('using error constructor', async (t) => {
  const value = 'my-value'
  // @ts-expect-error Typescript should raise "Argument of type 'string' is not assignable to parameter of type 'never'"
  const err = new UnreachableCaseError(value)

  t.throws(
    () => {
      throw err
    },
    {
      name: 'UnreachableCaseError',
      instanceOf: Error,
      message: `Unreachable case: "my-value"`
    }
  )

  t.throws(
    () => {
      throw err
    },
    {
      name: 'UnreachableCaseError'
    }
  )
})

test('using error constructor given custom message', async (t) => {
  const value = 'my-value'
  const message = 'My message'
  // @ts-expect-error Typescript should raise "Argument of type 'string' is not assignable to parameter of type 'never'"
  const err = new UnreachableCaseError(value, message)

  t.throws(
    () => {
      throw err
    },
    {
      name: 'UnreachableCaseError',
      instanceOf: Error,
      message: `${message}: "my-value"`
    }
  )
})

test('using assertion function', async (t) => {
  const value = 'my-value'

  t.throws(
    () => {
      // @ts-expect-error Typescript should raise "Argument of type 'string' is not assignable to parameter of type 'never'"
      return assertUnreachable(value)
    },
    {
      name: 'UnreachableCaseError',
      instanceOf: Error,
      message: `Unreachable case: "my-value"`
    }
  )
})

test('using assertion function given custom message', async (t) => {
  const value = 'my-value'
  const message = 'My message'

  t.throws(
    () => {
      // @ts-expect-error Typescript should raise "Argument of type 'string' is not assignable to parameter of type 'never'"
      return assertUnreachable(value, message)
    },
    {
      name: 'UnreachableCaseError',
      instanceOf: Error,
      message: `${message}: "my-value"`
    }
  )
})
