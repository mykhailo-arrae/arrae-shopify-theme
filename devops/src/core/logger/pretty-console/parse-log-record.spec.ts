import test from 'ava'
import SuperJSON from 'superjson'
import { type Input, type Output, parseLogRecord } from './parse-log-record.js'

const macro = test.macro<[Input, Output]>({
  exec: (t, input, expected) => {
    const actual = parseLogRecord(input)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${SuperJSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(macro, { message: [], properties: {} }, { messageLines: [], details: {} })

test(
  'should handle empty message',
  macro,
  { message: [''], properties: {} },
  { messageLines: [], details: {} }
)

test(
  'should indent multiline messages',
  macro,
  { message: ['validation error:\n', 'Invalid token', ''], properties: {} },
  { messageLines: ['validation error:', '  Invalid token'], details: {} }
)

test(
  'should skip name property',
  macro,
  {
    message: ['hello ', 'world'],
    properties: { foo: 'bar', name: 'my-logger' }
  },
  { messageLines: ['hello world'], details: { foo: 'bar' } }
)

test(
  'should skip properties that are printed in the message',
  macro,
  {
    message: ['hello ', 'mundo'],
    properties: { world: 'mundo', foo: 'bar' }
  },
  { messageLines: ['hello mundo'], details: { foo: 'bar' } }
)

const err = new Error('test')

test(
  'should keep "err"/"error" property',
  macro,
  {
    message: ['Error: ', err],
    properties: { err, error: err, details: err }
  },
  {
    messageLines: ['Error: { "name": "Error", "message": "test" }'],
    details: { err, error: err }
  }
)
