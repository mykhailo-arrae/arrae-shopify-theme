import test from 'ava'
import { type Equal, expect } from '../test-assertions.js'

test(`given Promise rejection`, async (t) => {
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
  Promise.reject('string instead of Error').catch((err) => {
    expect<Equal<unknown, typeof err>>(true)

    t.false(err instanceof Error)
  })

  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
  Promise.reject('string instead of Error').then(
    () => {
      t.fail('Promise should be rejected')
    },
    (err) => {
      expect<Equal<unknown, typeof err>>(true)

      t.false(err instanceof Error)
    }
  )
})
