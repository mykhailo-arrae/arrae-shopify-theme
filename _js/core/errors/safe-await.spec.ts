/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */

import test from 'ava'
import { AppError } from './app-error.js'
import { safeAwait } from './safe-await.js'

test('given resolved promise', async (t) => {
  const run = async () => {
    return { id: '123' }
  }

  const [err, data] = await safeAwait(run())
  t.is(err, null)

  if (err) {
    throw new Error('should not have error')
  }

  t.is(data.id, '123')
})

test('given resolved promise that resolves to nothing', async (t) => {
  const run = async (): Promise<void> => {
    return
  }

  const [err, data] = await safeAwait(run())
  t.is(err, null)

  if (err) {
    throw new Error('should not have error')
  }

  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  data satisfies void

  t.is(data, undefined)
})

test('given rejected promise', async (t) => {
  const expectedError = new Error('Test error')
  const run = async (): Promise<string> => {
    throw expectedError
  }

  const [err, data] = await safeAwait(run())
  t.is(err, expectedError)
  t.is(data, null)
})

test('given rejected promise with a string error', async (t) => {
  const message = 'Test error'
  const run = (): Promise<{ id: string }> => {
    return Promise.reject(message)
  }

  const [err, data] = await safeAwait(run())

  if (err == null) {
    throw new Error('should have error')
  }

  t.true(err instanceof AppError)

  if (err instanceof AppError === false) {
    throw new TypeError('should have AppError')
  }

  t.is(err.message, 'Error: Test error')
  t.is(err.details.originalError, message)
  t.is(data, null)
})

test('given rejected promise with a long string error', async (t) => {
  const message = 'a'.repeat(100)
  const run = (): Promise<{ id: string }> => {
    return Promise.reject(message)
  }

  const [err, data] = await safeAwait(run())

  if (err == null) {
    throw new Error('should have error')
  }

  t.true(err instanceof AppError)
  t.is(err.message, `Error: ${'a'.repeat(80)}`)
  t.is(data, null)
})

test('given rejected promise with an empty string error', async (t) => {
  const run = (): Promise<{ id: string }> => {
    return Promise.reject('')
  }

  const [err, data] = await safeAwait(run())

  if (err == null) {
    throw new Error('should have error')
  }

  t.true(err instanceof AppError)
  t.is(err.message, `Error: Unknown error`)
  t.is(data, null)
})

test('given rejected promise with a non-Error error', async (t) => {
  const originalError = { success: false, reason: 'Test error' }
  const run = (): Promise<{ id: string }> => {
    return Promise.reject(originalError)
  }

  const [err, data] = await safeAwait(run())

  if (err == null) {
    throw new Error('should have error')
  }

  t.true(err instanceof AppError)

  if (err instanceof AppError === false) {
    throw new TypeError('should have AppError')
  }

  t.is(err.message, 'Unknown error')
  t.is(err.details.originalError, originalError)
  t.is(data, null)
})
