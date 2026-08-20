import test from 'ava'
import { CartImplementationError as Err } from './cart-implementation-error.js'

test('given description', (t) => {
  t.throws(
    () => {
      throw new Err('This is a test', { description: 'Product not found' })
    },
    {
      name: 'CartImplementationError',
      instanceOf: Err,
      message: /this is a test/i
    }
  )
})

test('given metadata', (t) => {
  const err = new Err('This is a test', {
    description: 'Product not found',
    metadata: {
      id: '1',
      product: { handle: 'my-handle' }
    }
  })

  t.throws(
    () => {
      throw err
    },
    {
      instanceOf: Err
    }
  )

  t.deepEqual(err.details.metadata, {
    id: '1',
    product: { handle: 'my-handle' }
  })
  t.is(err.details.description, 'Product not found')
})

test('given cause', (t) => {
  const originalError = new Error('Original error')
  const err = new Err('This is a test', {
    cause: originalError,
    description: 'Product not found'
  })

  t.throws(
    () => {
      throw err
    },
    {
      instanceOf: Err
    }
  )

  t.is(err.details.description, 'Product not found')

  t.is(err.details.cause, originalError)
  t.is(
    err.cause,
    originalError,
    'should set upstream `cause` property via native Error constructor'
  )
})
