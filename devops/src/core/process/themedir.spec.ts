import test from 'ava'
import { themedir } from './themedir.js'

test('THEMEDIR helper', async (t) => {
  if (!process.env.WORKDIR) {
    throw new Error('WORKDIR environment variable not set')
  }

  t.is(themedir, process.env.WORKDIR)
})
