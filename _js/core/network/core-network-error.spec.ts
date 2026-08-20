import test from 'ava'
import { CoreNetworkError } from './core-network-error.js'

test('should create instance with message and details', (t) => {
  const message = 'Failed to fetch data'
  const details = {
    url: 'https://api.example.com/data',
    statusCode: 500,
    method: 'GET'
  }

  const error = new CoreNetworkError(message, details)

  t.is(error.message, message)
  t.deepEqual(error.details, details)
  t.is(error.name, 'CoreNetworkError')
})

test('should be instance of Error', (t) => {
  const error = new CoreNetworkError('Test message', {
    url: 'https://test.com',
    method: 'GET'
  })

  t.true(error instanceof Error)
  t.true(error instanceof CoreNetworkError)
})

test('should throw with correct properties', (t) => {
  const message = 'Network request failed'
  const details = {
    url: 'https://api.example.com/endpoint',
    statusCode: 404,
    method: 'POST'
  }

  t.throws(
    () => {
      throw new CoreNetworkError(message, details)
    },
    {
      name: 'CoreNetworkError',
      instanceOf: CoreNetworkError,
      message: message
    }
  )
})

test('should preserve stack trace', (t) => {
  const error = new CoreNetworkError('Test error', {
    url: 'https://test.com',
    method: 'GET'
  })

  t.true(typeof error.stack === 'string')
  t.true(error.stack !== undefined && error.stack.length > 0)
})

test('should handle network-specific properties in details', (t) => {
  const details = {
    url: 'https://api.example.com/cart',
    statusCode: 408,
    method: 'PUT',
    timeout: 5000,
    retryCount: 3
  }

  const error = new CoreNetworkError('Request timeout', details)

  t.is(error.details.url, 'https://api.example.com/cart')
  t.is(error.details.statusCode, 408)
  t.is(error.details.method, 'PUT')
  t.is(error.details.timeout, 5000)
  t.is(error.details.retryCount, 3)
})

test('should have non-enumerable name property', (t) => {
  const error = new CoreNetworkError('Test', {
    url: 'https://test.com',
    method: 'GET'
  })

  const descriptor = Object.getOwnPropertyDescriptor(error, 'name')
  t.truthy(descriptor)
  if (descriptor) {
    t.false(descriptor.enumerable)
    t.true(descriptor.configurable)
  }
})

test('should maintain proper prototype chain', (t) => {
  const error = new CoreNetworkError('Test', {
    url: 'https://test.com',
    method: 'GET'
  })

  t.is(Object.getPrototypeOf(error), CoreNetworkError.prototype)
  t.is(Object.getPrototypeOf(Object.getPrototypeOf(error)), Error.prototype)
})

test('should work with JSON serialization', (t) => {
  const error = new CoreNetworkError('Serialization test', {
    url: 'https://api.example.com/test',
    statusCode: 500,
    method: 'GET',
    data: { key: 'value' }
  })

  // Test that error properties can be serialized to JSON
  const serialized = JSON.stringify({
    message: error.message,
    name: error.name,
    details: error.details
  })

  t.true(typeof serialized === 'string')
  t.true(serialized.includes('Serialization test'))
  t.true(serialized.includes('CoreNetworkError'))
  t.true(serialized.includes('https://api.example.com/test'))
  t.true(serialized.includes('GET'))
})

test('given error response', (t) => {
  const errorResponse = {
    error: 'This is a test'
  }
  const err = new CoreNetworkError('This is a test', {
    url: 'https://example.com/api',
    method: 'POST',
    errorResponse
  })

  t.throws(
    () => {
      throw err
    },
    {
      instanceOf: CoreNetworkError
    }
  )

  t.is(err.details.errorResponse, errorResponse)
})

test('given custom details', (t) => {
  const err = new CoreNetworkError('This is a test', {
    url: 'https://example.com/api',
    statusCode: 403,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })

  t.throws(
    () => {
      throw err
    },
    {
      instanceOf: CoreNetworkError
    }
  )

  t.is(err.details.url, 'https://example.com/api')
  t.is(err.details.statusCode, 403)
  t.is(err.details.method, 'POST')
  t.deepEqual(err.details.headers, { 'Content-Type': 'application/json' })
})
