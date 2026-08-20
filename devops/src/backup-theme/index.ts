import { z } from 'devops-zod4'
import { DeploymentTargetThemeNames } from '../config/deployments.js'
import { DevOpsError } from '../core/errors/index.js'
import {
  addWithCommit,
  type DecorateCommitMessage
} from '../core/git/add-with-commit.js'
import { initGit } from '../core/git/index.js'
import { mergeTheirs } from '../core/git/merge-theirs.js'
import { switchToBranch } from '../core/git/switch-to-branch.js'
import { initLogger } from '../core/logger/index.js'
import { makeHandleRejection } from '../core/process/handle-rejection.js'
import { ShopifyCliCredentials } from '../core/shopify/cli-credentials.js'
import { fetchTheme } from '../core/shopify/fetch-theme.js'
import { findTheme } from '../core/shopify/find-theme.js'
import { kebabCase } from '../core/string/kebab-case.js'

const parseEnv = async (env = process.env) => {
  const ExtraEnv = z.object({
    SHOPIFY_CLI_TTY: z.literal('0'),
    THEME_NAME: z.string().min(1).trim()
  })

  const credentials = await ShopifyCliCredentials.parseAsync(env)
  const extra = await ExtraEnv.parseAsync(env)

  return { ...credentials, ...extra }
}

const logger = initLogger()

const run = async (): Promise<void> => {
  logger.trace('Parsing configuration')
  const {
    accessToken,
    shop,
    shopHandle,
    THEME_NAME: backupThemeName
  } = await parseEnv(process.env)

  const shouldBackupLiveTheme = backupThemeName === '_live'

  const git = await initGit({ logger })

  logger.debug('Finding source theme')
  const { theme, allThemes } = await findTheme({
    accessToken,
    shop,
    predicate: ({ name, role }): boolean => {
      return shouldBackupLiveTheme ? role === 'main' : name === backupThemeName
    }
  })

  if (shouldBackupLiveTheme && theme == null) {
    throw new DevOpsError('Live theme not found', {
      theme,
      allThemes,
      themeCount: allThemes.length,
      traceTag: '39f656e6dbcc467cbaab55925d946013'
    })
  }

  if (theme == null) {
    logger.warn('Theme not found: {backupThemeName}', {
      themeCount: allThemes.length,
      allThemes,
      backupThemeName
    })
    return
  }

  const { id: themeId, name: themeName, role: themeRole } = theme

  const decorateCommitMessage: DecorateCommitMessage = (message) => {
    return [
      `${message} - ${themeId}@${shopHandle}`,
      [
        `Store: ${shopHandle}`,
        `Theme Name: ${themeName}`,
        `Theme ID: ${themeId}`
      ].join('\n')
    ]
  }

  const { current: initialBranchName } = await git.branch()
  const sourceBranch: string = initialBranchName.includes('main')
    ? 'origin/main'
    : initialBranchName

  const branchSegments: ['live'] | ['uat'] | ['other', string] =
    themeRole === 'main'
      ? ['live']
      : themeName === DeploymentTargetThemeNames.uat
        ? ['uat']
        : ['other', kebabCase(kebabCase(themeName).slice(0, 240))]

  const targetBranchName = ['backup', ...branchSegments, shopHandle].join('/')

  await switchToBranch({
    git,
    logger,
    targetBranchName,
    baseBranchCandidates: ['origin/main']
  })

  await mergeTheirs({
    logger,
    sourceBranch
  })

  logger.debug('Fetching theme')
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
    commitMessage: { mode: 'plain', line: 'Backup app content' }
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
    commitMessage: { mode: 'plain', line: 'Backup theme content' }
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
    commitMessage: { mode: 'plain', line: 'Backup theme code' }
  })

  await addWithCommit({
    git,
    logger,
    decorateCommitMessage,
    pathspecs: [{ patterns: [':(glob).'] }],
    commitMessage: { mode: 'plain', line: 'Backup other files' }
  })

  logger.info('The backup branch is ready: {targetBranchName}', {
    targetBranchName
  })
}

run().catch(makeHandleRejection({ logger }))
