import test from 'ava'
import { makeMessageBus } from './index.js'

test('given an error in a subscription handler', async (t) => {
  const err = Error('Error in subscription handler')
  const bus = makeMessageBus<{ name: 'a' } | { name: 'b' }>((...args) => {
    t.is(args[0], 'Message handler error:')
    t.is(args[1], err)
  })

  type LogItem =
    | { type: 'event'; name: 'a' | 'b' | 'c'; sub: 'x' | 'y' }
    | { type: 'comment'; message: string }

  const log: LogItem[] = []

  bus.on('a').do(() => {
    throw err
  })

  bus.on('a').do(({ name }) => {
    log.push({ type: 'event', name, sub: 'y' })
  })

  bus.send({ name: 'a' })
  bus.send({ name: 'a' })
  bus.send({ name: 'a' })

  t.deepEqual(
    log,
    [
      { type: 'event', name: 'a', sub: 'y' },
      { type: 'event', name: 'a', sub: 'y' },
      { type: 'event', name: 'a', sub: 'y' }
    ],
    'should not crash when one subscription handler throws an error'
  )
})
