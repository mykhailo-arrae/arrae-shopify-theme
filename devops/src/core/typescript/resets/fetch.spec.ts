import test from 'ava'
import type { JSONValue } from '../json-value.js'
import { doNotRun, type Equal, type Expect } from '../test-assertions.js'

test(`given JSON network response`, async (t) => {
  doNotRun(async () => {
    const result = await fetch('/cart.json').then((res) => res.json())

    console.warn(result)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type tests = [Expect<Equal<typeof result, JSONValue>>]
  })
  t.pass()
})

test(`given an attempt to add a generic parameter for json()`, async (t) => {
  doNotRun(async () => {
    await fetch('/cart.json').then((res) => {
      // @ts-expect-error Safety measure in case someone tries to introduce json<T> generic
      return res.json<{ id: number }>()
    })
  })
  t.pass()
})
