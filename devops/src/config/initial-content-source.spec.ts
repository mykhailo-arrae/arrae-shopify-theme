import test from 'ava'
import {
  type InitialContentSource,
  InitialContentSourcePipeline
} from './initial-content-source.js'

const macro = test.macro<[string | null | undefined, InitialContentSource]>({
  exec: (t, input, expected) => {
    const actual = InitialContentSourcePipeline.parse(input)
    t.is(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${input} ${providedTitle}`.trim()
  }
})

test(macro, 'git', 'git')
test(macro, 'live-theme', 'live-theme')
test(macro, undefined, 'live-theme')
test(macro, null, 'live-theme')
test('empty string', macro, '', 'live-theme')
test('whitespace', macro, ' ', 'live-theme')

test('throws on invalid input', (t) => {
  t.throws(() => InitialContentSourcePipeline.parse('invalid'), {
    message: /invalid option/i
  })
})
