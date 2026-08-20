import { z } from 'devops-zod4'
import { DevOpsError } from '../core/errors/index.js'
import { restoreFilesFromStash, stashFiles } from '../core/fs/stash-files.js'
import {
  addWithCommit,
  type DecorateCommitMessage
} from '../core/git/add-with-commit.js'
import { initGit } from '../core/git/index.js'
import { switchToBranch } from '../core/git/switch-to-branch.js'
import { initLogger } from '../core/logger/index.js'
import { makeHandleRejection } from '../core/process/handle-rejection.js'
import { ShopifyCliCredentials } from '../core/shopify/cli-credentials.js'
import { fetchTheme } from '../core/shopify/fetch-theme.js'
import { findTheme } from '../core/shopify/find-theme.js'

const parseEnv = async (env = process.env) => {
  const ExtraEnv = z.object({
    SHOPIFY_CLI_TTY: z.literal('0'),
    SHOPIFY_FLAG_FORCE: z.literal('1')
  })

  const credentials = await ShopifyCliCredentials.parseAsync(env)
  const extra = await ExtraEnv.parseAsync(env)

  return { ...credentials, ...extra }
}

const logger = initLogger().with({ name: 'theme-tracker' })

const stashPaths = ['bb.edn', 'biome.json', 'devops']

const run = async (): Promise<void> => {
  logger.trace('Parsing configuration')
  const { accessToken, shopHandle } = await parseEnv(process.env)

  const git = await initGit({ logger })

  logger.trace('Finding theme')
  const { theme, allThemes } = await findTheme({
    accessToken,
    shop: `${shopHandle}.myshopify.com`,
    predicate: ({ role }): boolean => {
      return role === 'main'
    }
  })

  if (theme == null) {
    throw new DevOpsError('Theme not found', {
      theme,
      allThemes,
      themeCount: allThemes.length,
      traceTag: 'ad64ec3eda6d4504be93d30757cc85ef'
    })
  }

  const { id: themeId, name: themeName } = theme

  const decorateCommitMessage: DecorateCommitMessage = (message) => {
    return [
      `${message} / ${themeName} / ${themeId}@${shopHandle}`,
      [
        `Store: ${shopHandle}`,
        `Theme Name: ${themeName}`,
        `Theme ID: ${themeId}`
      ].join('\n')
    ]
  }

  const targetBranchName = ['theme-tracker', 'live', shopHandle].join('/')

  // Switching branches can erase the files required for this task to run
  await stashFiles({ logger, paths: stashPaths })

  await switchToBranch({
    git,
    logger,
    targetBranchName,
    baseBranchCandidates: ['origin/main']
  })

  await restoreFilesFromStash({ logger, paths: stashPaths })

  logger.trace('Fetching theme')
  await fetchTheme({ themeId, clean: true })
  logger.info('Theme fetched', { id: themeId, name: themeName })

  /**
   * Preserve app content from GemPages, Replo
   *
   * See:
   * - https://apps.shopify.com/gempages
   * - https://www.replo.app/
   */
  await addWithCommit({
    git,
    logger,
    decorateCommitMessage,
    pathspecs: [
      {
        patterns: [
          ':(glob)**/*gem-*-template*',
          ':(glob)**/*replo*',
          ':(glob)assets/gem-*',
          ':(glob)snippets/gem-*'
        ]
      }
    ],
    commitMessage: { mode: 'plain', line: 'App content' }
  })

  await addWithCommit({
    git,
    logger,
    decorateCommitMessage,
    pathspecs: [
      {
        patterns: [
          ':(glob)config/settings_data.json',
          ':(glob)locales/**/*.json',
          ':(glob)sections/**/*.json',
          ':(glob)templates/**/*.json'
        ]
      }
    ],
    commitMessage: { mode: 'prefer-filename', line: 'Content' }
  })

  await addWithCommit({
    git,
    logger,
    decorateCommitMessage,
    pathspecs: [
      {
        patterns: [
          ':(glob)assets',
          ':(glob)blocks',
          ':(glob)config',
          ':(glob)layout',
          ':(glob)locales',
          ':(glob)sections',
          ':(glob)snippets',
          ':(glob)templates'
        ]
      }
    ],
    commitMessage: { mode: 'prefer-filename', line: 'Code' }
  })

  logger.info('The tracker branch is ready: {targetBranchName}', {
    targetBranchName
  })
}

run().catch(makeHandleRejection({ logger }))
