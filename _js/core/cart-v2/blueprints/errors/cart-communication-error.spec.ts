import test from 'ava'
import { CartCommunicationError } from './cart-communication-error.js'

test('should create instance with message and details', (t) => {
  const message = 'Failed to fetch cart data'
  const details = {
    description: 'Network timeout after 5 seconds',
    statusCode: 408
  }

  const error = new CartCommunicationError(message, details)

  t.is(error.message, message)
  t.deepEqual(error.details, details)
  t.is(error.name, 'CartCommunicationError')
})

test('should be instance of Error', (t) => {
  const error = new CartCommunicationError('Test message', {
    description: 'Test description'
  })

  t.true(error instanceof Error)
  t.true(error instanceof CartCommunicationError)
})

test('should throw with correct properties', (t) => {
  const message = 'API request failed'
  const details = {
    description: 'Server returned 500 status',
    statusCode: 500,
    endpoint: '/api/cart'
  }

  t.throws(
    () => {
      throw new CartCommunicationError(message, details)
    },
    {
      name: 'CartCommunicationError',
      instanceOf: CartCommunicationError,
      message: message
    }
  )
})

test('should preserve stack trace', (t) => {
  const error = new CartCommunicationError('Test error', {
    description: 'Test description'
  })

  t.true(typeof error.stack === 'string')
  t.true(error.stack !== undefined && error.stack.length > 0)
})

test('should handle additional properties in details', (t) => {
  const details = {
    description: 'Request timeout',
    metadata: {
      statusCode: 408,
      timeout: 5000,
      retryCount: 3,
      url: 'https://example.com/cart.json'
    }
  }

  const error = new CartCommunicationError('Request timeout', details)

  t.is(error.details.description, 'Request timeout')
  t.is(error.details.metadata?.statusCode, 408)
  t.is(error.details.metadata?.timeout, 5000)
  t.is(error.details.metadata?.retryCount, 3)
  t.is(error.details.metadata?.url, 'https://example.com/cart.json')
})

test('should have non-enumerable name property', (t) => {
  const error = new CartCommunicationError('Test', {
    description: 'Test description'
  })

  const descriptor = Object.getOwnPropertyDescriptor(error, 'name')
  t.truthy(descriptor)
  if (descriptor) {
    t.false(descriptor.enumerable)
    t.true(descriptor.configurable)
  }
})

test('should maintain proper prototype chain', (t) => {
  const error = new CartCommunicationError('Test', {
    description: 'Test description'
  })

  t.is(Object.getPrototypeOf(error), CartCommunicationError.prototype)
  t.is(Object.getPrototypeOf(Object.getPrototypeOf(error)), Error.prototype)
})

test('should work with JSON serialization', (t) => {
  const error = new CartCommunicationError('Serialization test', {
    description: 'Testing JSON serialization',
    metadata: { key: 'value' }
  })

  // Test that error properties can be serialized to JSON
  const serialized = JSON.stringify({
    message: error.message,
    name: error.name,
    details: error.details
  })

  t.true(typeof serialized === 'string')
  t.true(serialized.includes('Serialization test'))
  t.true(serialized.includes('CartCommunicationError'))
  t.true(serialized.includes('Testing JSON serialization'))
})

test('given cause', (t) => {
  const originalError = new Error('Original error')
  const err = new CartCommunicationError('This is a test', {
    cause: originalError,
    description: 'Test description'
  })

  t.is(err.details.description, 'Test description')

  t.is(err.details.cause, originalError)
  t.is(
    err.cause,
    originalError,
    'should set upstream `cause` property via native Error constructor'
  )
})
