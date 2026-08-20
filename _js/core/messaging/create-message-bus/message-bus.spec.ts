import test from 'ava'
import { makeMessageBus } from './index.js'

test('given two subscribers', async (t) => {
  const bus = makeMessageBus<{ name: 'a' } | { name: 'b' } | { name: 'c' }>()

  type LogItem =
    | { type: 'event'; name: 'a' | 'b' | 'c'; sub: 'x' | 'y' }
    | { type: 'comment'; message: string }

  const log: LogItem[] = []

  log.push({ type: 'comment', message: 'Subscribe x to all' })

  const unsubxa = bus.on('a').do(({ name }) => {
    log.push({ type: 'event', name, sub: 'x' })
  })

  const unsubxb = bus.on('b').do(({ name }) => {
    log.push({ type: 'event', name, sub: 'x' })
  })

  const unsubxc = bus.on('c').do(({ name }) => {
    log.push({ type: 'event', name, sub: 'x' })
  })

  log.push({ type: 'comment', message: 'First batch' })

  bus.send({ name: 'a' })
  bus.send({ name: 'b' })
  bus.send({ name: 'c' })

  log.push({ type: 'comment', message: 'Subscribe y to a' })

  const unsubya = bus.on('a').do(({ name }) => {
    log.push({ type: 'event', name, sub: 'y' })
  })

  log.push({ type: 'comment', message: 'Second batch' })

  bus.send({ name: 'c' })
  bus.send({ name: 'b' })
  bus.send({ name: 'a' })

  log.push({ type: 'comment', message: 'Unsubscribe x from c' })

  unsubxc()

  log.push({ type: 'comment', message: 'Third batch' })

  bus.send({ name: 'a' })
  bus.send({ name: 'b' })
  bus.send({ name: 'c' })

  log.push({ type: 'comment', message: 'Unsubscribe all' })

  unsubxa()
  unsubxb()
  unsubxc()
  unsubya()

  log.push({ type: 'comment', message: 'Last batch' })
  bus.send({ name: 'a' })

  log.push({ type: 'comment', message: 'End' })

  t.deepEqual(log, [
    { type: 'comment', message: 'Subscribe x to all' },
    { type: 'comment', message: 'First batch' },
    { type: 'event', name: 'a', sub: 'x' },
    { type: 'event', name: 'b', sub: 'x' },
    { type: 'event', name: 'c', sub: 'x' },
    { type: 'comment', message: 'Subscribe y to a' },
    { type: 'comment', message: 'Second batch' },
    { type: 'event', name: 'c', sub: 'x' },
    { type: 'event', name: 'b', sub: 'x' },
    { type: 'event', name: 'a', sub: 'x' },
    { type: 'event', name: 'a', sub: 'y' },
    { type: 'comment', message: 'Unsubscribe x from c' },
    { type: 'comment', message: 'Third batch' },
    { type: 'event', name: 'a', sub: 'x' },
    { type: 'event', name: 'a', sub: 'y' },
    { type: 'event', name: 'b', sub: 'x' },
    { type: 'comment', message: 'Unsubscribe all' },
    { type: 'comment', message: 'Last batch' },
    { type: 'comment', message: 'End' }
  ] satisfies LogItem[])
})
