import test from 'ava'
import type { z } from 'devops-zod4'
import { ContentOverridePatternsPipeline as schema } from './schema.js'

const macro = test.macro<[unknown, z.output<typeof schema>]>({
  exec: async (t, input, expected) => {
    const actual = await schema.parseAsync(input)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test('should split on |||', macro, 'templates/**/*.json|||locales/*.json', [
  'templates/**/*.json',
  'locales/*.json'
])
test(macro, 'templates/search.json', ['templates/search.json'])
test(macro, 'templates/search.json|||', ['templates/search.json'])
test(
  'should trim whitespace',
  macro,
  ' templates/search.json  ||| locales/en.default.json',
  ['templates/search.json', 'locales/en.default.json']
)
test(macro, 'templates/**/*.json', ['templates/**/*.json'])

test(macro, null, [])
test(macro, undefined, [])
test(macro, '', [])
test(macro, '|||', [])
