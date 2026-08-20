import test from 'ava'
import { convertFormDataToSearch as c } from './form-data-to-search.js'

test('given basic form data', (t) => {
  const data = new FormData()

  data.set('q', 'hello world')
  data.set('limit', '10')

  t.is(c(data), 'q=hello%20world&limit=10')
})

test('given multiple field values', (t) => {
  const data = new FormData()

  data.set('q', 'hello world')
  data.append('filter', 'shirts')
  data.append('filter', 'pants')

  t.is(c(data), 'q=hello%20world&filter=shirts&filter=pants')
})

test('given a blob', (t) => {
  const data = new FormData()

  const blob = new Blob(['{ "id": 1 }'], { type: 'application/json' })

  data.set('q', 'hello world')
  data.set('avatar', blob, 'foo.txt')

  t.is(c(data), 'q=hello%20world', 'should not handle file uploads')
})
