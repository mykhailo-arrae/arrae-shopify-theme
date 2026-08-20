import test from 'ava'
import type { JSONValue } from '../json-value.js'
import type { Equal, Expect } from '../test-assertions.js'

test(`JSON.parse should return unknown type in Typescript`, async (t) => {
  // @ts-expect-error Safety measure in case someone tries to introduce JSON.parse<T> generic
  JSON.parse<string>('{}')

  const result = JSON.parse('{ "handle": "my-product" }')

  t.deepEqual(result, { handle: 'my-product' })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type tests = [Expect<Equal<typeof result, JSONValue>>]
})
