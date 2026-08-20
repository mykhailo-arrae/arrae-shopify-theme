import test from 'ava'
import { DeploymentMatrix, type DeploymentMatrixInput } from './matrix.js'

const macro = test.macro<[DeploymentMatrixInput, DeploymentMatrix]>({
  exec: async (t, input, expected) => {
    const actual = await DeploymentMatrix.parseAsync(input)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(
  macro,
  {
    byTarget: {
      'dev-testing': {
        environment: [{ name: 'vaangoods-dev' }]
      },
      'dev-qa': {
        environment: [
          {
            name: 'vaangoods-dev',
            contentOverridePatterns: 'templates/**/*.json|||locales/*.json'
          }
        ]
      },
      uat: {
        environment: [{ name: 'vaangoods-dev' }]
      }
    }
  },
  {
    byTarget: {
      'dev-testing': {
        environment: [{ name: 'vaangoods-dev', contentOverridePatterns: '' }]
      },
      'dev-qa': {
        environment: [
          {
            name: 'vaangoods-dev',
            contentOverridePatterns: 'templates/**/*.json|||locales/*.json'
          }
        ]
      },
      uat: {
        environment: [{ name: 'vaangoods-dev', contentOverridePatterns: '' }]
      }
    }
  } satisfies DeploymentMatrix
)

test('should require all deployment targets', (t) => {
  const result = DeploymentMatrix.safeParse({
    byTarget: {
      'dev-testing': {
        environment: [{ name: 'vaangoods-dev' }]
      }
    }
  })

  if (result.success) {
    throw new Error('should have error')
  }

  t.is(result.error.issues.length, 2)
  t.deepEqual(result.error.issues[0]?.path, ['byTarget', 'dev-qa'])
  t.deepEqual(result.error.issues[1]?.path, ['byTarget', 'uat'])
})
