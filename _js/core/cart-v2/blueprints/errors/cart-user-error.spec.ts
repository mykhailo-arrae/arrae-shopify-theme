import test from 'ava'
import { CartUserError as Err } from './cart-user-error.js'

test('given description', async (t) => {
  const err = new Err('out_of_stock', {
    description: 'Product A is not available'
  })

  t.throws(
    () => {
      throw err
    },
    {
      name: 'CartUserError',
      instanceOf: Err,
      message: /out_of_stock/i
    }
  )

  t.deepEqual(err.details, { description: 'Product A is not available' })
})

test('given custom details', async (t) => {
  const err = new Err('out_of_stock', {
    description: 'Product A is not available',
    metadata: {
      productId: '1'
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

  t.is(err.details.description, 'Product A is not available')
  t.is(err.details.metadata?.productId, '1')
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
