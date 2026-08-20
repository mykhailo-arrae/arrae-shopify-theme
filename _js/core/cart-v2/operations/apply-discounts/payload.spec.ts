import test from 'ava'
import { ApplyDiscountsPayload } from './payload.js'

test('should parse valid payload with both add and remove', (t) => {
  const input = {
    add: ['DISCOUNT1', 'DISCOUNT2'],
    remove: ['OLD_DISCOUNT']
  }

  t.deepEqual(ApplyDiscountsPayload.parse(input), input)
})

test('should parse valid payload with only add', (t) => {
  const input = {
    add: ['DISCOUNT1']
  }

  t.deepEqual(ApplyDiscountsPayload.parse(input), {
    add: ['DISCOUNT1'],
    remove: []
  })
})

test('should parse valid payload with only remove', (t) => {
  const input = {
    remove: ['OLD_DISCOUNT']
  }

  t.deepEqual(ApplyDiscountsPayload.parse(input), {
    add: [],
    remove: ['OLD_DISCOUNT']
  })
})

test('should parse empty payload with defaults', (t) => {
  const input = {}

  t.deepEqual(ApplyDiscountsPayload.parse(input), {
    add: [],
    remove: []
  })
})

test('should handle empty arrays', (t) => {
  const input = {
    add: [],
    remove: []
  }

  t.deepEqual(ApplyDiscountsPayload.parse(input), input)
})
