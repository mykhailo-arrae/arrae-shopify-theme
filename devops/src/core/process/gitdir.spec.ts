import test from 'ava'
import { gitdir } from './gitdir.js'

test('GITDIR helper', async (t) => {
  if (!process.env.WORKDIR) {
    throw new Error('WORKDIR environment variable not set')
  }

  t.is(gitdir, process.env.WORKDIR)
})
