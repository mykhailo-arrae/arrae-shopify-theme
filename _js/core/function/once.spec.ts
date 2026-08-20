import test from 'ava'
import { once } from './once.js'

test('given wrapped function', async (t) => {
  const makeCounter = () => {
    let count = 0
    return () => {
      count++
      return count
    }
  }

  const counter = once(makeCounter())

  const results = [counter(), counter(), counter()]

  t.deepEqual(results, [1, 1, 1])
})
