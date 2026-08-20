import test from 'ava'
import { OptionsPipeline, type OptionsPipelineInput } from './index.js'

const macro = test.macro<[unknown, OptionsPipeline]>({
  exec: async (t, input, expected) => {
    const actual = await OptionsPipeline.parseAsync(input)
    t.like(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(
  'should accept minimal requirements through args',
  macro,
  {
    args: {
      target: 'dev-qa',
      step: 'prepare'
    },
    env: {}
  } satisfies OptionsPipelineInput,
  {
    target: 'dev-qa',
    step: 'prepare',
    contentOverridePatterns: [],
    initialContentSource: 'live-theme',
    devopsActor: 'unknown'
  } satisfies OptionsPipeline
)

test(
  'should accept minimal requirements through env variables',
  macro,
  {
    args: {},
    env: {
      DEPLOYMENT_TARGET: 'dev-qa',
      DEPLOYMENT_STEP: 'prepare'
    }
  } satisfies OptionsPipelineInput,
  {
    target: 'dev-qa',
    step: 'prepare',
    contentOverridePatterns: [],
    initialContentSource: 'live-theme',
    devopsActor: 'unknown'
  } satisfies OptionsPipeline
)

test(
  'should combine multiple sources of content override patterns',
  macro,
  {
    args: {
      target: 'dev-qa',
      step: 'prepare',
      contentOverridePatterns: 'x/**/*.json|||y/**/*.json'
    },
    env: {
      DEPLOYMENT_CONTENT_OVERRIDE_PATTERNS_WORKFLOW_CONFIG:
        'a/**/*.json|||b/**/*.json',
      DEPLOYMENT_CONTENT_OVERRIDE_PATTERNS_DISPATCH: 'c/**/*.json|||d/**/*.json'
    }
  } satisfies OptionsPipelineInput,
  {
    devopsActor: 'unknown',
    contentOverridePatterns: [
      'a/**/*.json',
      'b/**/*.json',
      'c/**/*.json',
      'd/**/*.json',
      'x/**/*.json',
      'y/**/*.json'
    ],
    initialContentSource: 'live-theme',
    step: 'prepare',
    target: 'dev-qa'
  } satisfies OptionsPipeline
)
