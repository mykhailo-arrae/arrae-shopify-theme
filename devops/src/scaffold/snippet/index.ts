import input from '@inquirer/input'
import select from '@inquirer/select'
import { z } from 'devops-zod4'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import type {
  DynamicSnippet,
  Snippet,
  StaticSnippet
} from '../../core/shopify/snippets/schema.js'
import { scaffoldDynamicSnippet } from './scaffold-dynamic-snippet.js'
import { scaffoldStaticSnippet } from './scaffold-static-snippet.js'

const logger = initLogger().with({ name: 'scaffold-snippet' })

const logErrorDetails = makeLogErrorDetails(logger)

const SnippetName = z.string().min(2)

export const main = async (): Promise<void> => {
  const snippetName = await input({
    message: 'Enter snippet name',
    validate: (value) => {
      const result = SnippetName.safeParse(value)
      return result.success
        ? true
        : result.error.issues
            .map((issue) => issue.message)
            .join('\n')
            .trim()
    }
  })

  const type = await select<Snippet['type']>({
    message: 'Select snippet type',
    default: 'dynamic',
    choices: [
      {
        name: 'Dynamic',
        value: 'dynamic',
        description: 'Dynamic snippets have companion JS/TS code'
      },
      {
        name: 'Static',
        value: 'static',
        description: 'Static snippets have scoped styles only'
      }
    ]
  })

  const stylesheet = await select<Snippet['stylesheet']>({
    message: 'Select stylesheet mode',
    default: type === 'dynamic' ? 'inline' : 'external',
    choices: [
      {
        name: 'Inline',
        value: 'inline',
        description: 'The stylesheet is inlined into the compiled snippet file'
      },
      {
        name: 'External',
        value: 'external',
        description:
          'A separate stylesheet file is created alongside the snippet file, e.g., `product-card-stylesheet.liquid`'
      }
    ]
  })

  if (type === 'static') {
    const schema: StaticSnippet = { type, stylesheet }
    await scaffoldStaticSnippet({ logger, snippetName, schema })
    return
  }

  const tag = await select<DynamicSnippet['tag']>({
    message: 'Select HTML tag type for the snippet container',
    default: 'div',
    choices: [
      {
        value: 'div'
      },
      {
        value: 'article'
      },
      {
        value: 'aside'
      },
      {
        value: 'header'
      },
      {
        value: 'footer'
      },
      {
        value: 'section'
      }
    ]
  })

  const schema: DynamicSnippet = { type, stylesheet, tag, class: [] }
  await scaffoldDynamicSnippet({ logger, snippetName, schema })
}

main().catch(logErrorDetails)
