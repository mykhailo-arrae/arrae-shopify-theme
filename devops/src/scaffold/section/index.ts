import input from '@inquirer/input'
import select from '@inquirer/select'
import { z } from 'devops-zod4'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { scaffoldDynamicSection } from './scaffold-dynamic-section.js'
import { scaffoldStaticSection } from './scaffold-static-section.js'

const logger = initLogger().with({ name: 'scaffold-section' })

const logErrorDetails = makeLogErrorDetails(logger)

const SectionName = z.string().min(2)

export const main = async (): Promise<void> => {
  const sectionName = await input({
    message: 'Enter section name',
    validate: (value) => {
      const result = SectionName.safeParse(value)
      return result.success
        ? true
        : result.error.issues
            .map((issue) => issue.message)
            .join('\n')
            .trim()
    }
  })

  const sectionType = await select<'dynamic' | 'static'>({
    message: 'Select section type',
    default: 'dynamic',
    choices: [
      {
        name: 'Dynamic',
        value: 'dynamic',
        description: 'Dynamic sections have companion JS/TS code'
      },
      {
        name: 'Static',
        value: 'static',
        description: 'Static sections have scoped styles only'
      }
    ]
  })

  if (sectionType === 'static') {
    await scaffoldStaticSection({ logger, sectionName })
    return
  }

  sectionType satisfies 'dynamic'

  await scaffoldDynamicSection({ logger, sectionName })
}

main().catch(logErrorDetails)
