import test from 'ava'
import { DeploymentTarget } from './target.js'

const macro = test.macro<[string, DeploymentTarget]>({
  exec: async (t, input, expected) => {
    const actual = await DeploymentTarget.parseAsync(input)
    t.is(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(macro, 'dev-testing', 'dev-testing')
test(macro, 'dev-qa', 'dev-qa')
test(macro, 'uat', 'uat')

test('should have 3 enum values', (t) => {
  t.is(DeploymentTarget.options.length, 3)
})
