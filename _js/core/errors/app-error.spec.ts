import test from 'ava'
import { AppError } from './app-error.js'

test('given no details', async (t) => {
  t.throws(
    () => {
      throw new AppError('This is a test')
    },
    {
      name: 'AppError',
      instanceOf: AppError,
      message: /this is a test/i
    }
  )
})

test('given trace tag', async (t) => {
  const traceTag = '060a3e40b0fa4ba5980157d438156083'
  const err = new AppError('This is a test', { traceTag })

  t.throws(
    () => {
      throw err
    },
    {
      instanceOf: AppError
    }
  )

  t.is(err.details.traceTag, traceTag)
})

test('given custom details', async (t) => {
  const err = new AppError('This is a test', {
    id: '1',
    product: { handle: 'my-handle' }
  })

  t.throws(
    () => {
      throw err
    },
    {
      instanceOf: AppError
    }
  )

  t.is(err.details.id, '1')
  t.deepEqual(err.details.product, { handle: 'my-handle' })
})

test('given custom details and trace tag ', async (t) => {
  const traceTag = '974978666f36439bb1bfda6022042fa8'
  const err = new AppError('This is a test', {
    traceTag,
    id: '1'
  })

  t.throws(
    () => {
      throw err
    },
    {
      instanceOf: AppError
    }
  )

  t.is(err.details.id, '1')
  t.is(err.details.traceTag, traceTag)
})
