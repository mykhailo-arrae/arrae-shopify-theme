import { EOL } from 'node:os'
import { addEmptyCommit } from '../../core/git/add-empty-commit.js'
import { addWithCommit } from '../../core/git/add-with-commit.js'
import { clearWorkingCopy } from '../../core/git/clear-working-copy.js'
import { initGit } from '../../core/git/index.js'
import { logBranchDiffSummary } from '../../core/git/log-branch-diff-summary.js'
import { mergeTheirs } from '../../core/git/merge-theirs.js'
import { switchToBranch } from '../../core/git/switch-to-branch.js'
import type { Logger } from '../../core/logger/index.js'
import { fetchTheme } from '../../core/shopify/fetch-theme.js'
import { isPresent } from '../../core/typescript/is-present.js'
import { validateContentOverridePatterns } from '../config/content-override-patterns/validate-patterns.js'
import type { RuntimeConfig } from '../config/index.js'
import { findOrCreateTargetTheme } from './find-or-create-target-theme.js'

export type Input = {
  logger: Logger
  config: RuntimeConfig
}

export const prepareDeploymentBranch = async ({
  logger,
  config
}: Input): Promise<void> => {
  logger.debug('Parsing configuration')
  const {
    credentials: { accessToken, shop, shopHandle },
    options: {
      contentOverridePatterns: _contentOverridePatterns,
      devopsActor,
      initialContentSource,
      target
    }
  } = config

  const contentOverridePatterns = _contentOverridePatterns.map((pattern) => {
    return `:(exclude,icase,glob)${pattern}`
  })

  await validateContentOverridePatterns({
    logger,
    patterns: contentOverridePatterns
  })

  const git = await initGit({ logger })

  const targetBranchName = `deployments/${target}/${shopHandle}`

  logger.debug('Switching to deployment branch', { branch: targetBranchName })
  const baseBranchCandidates = [
    target === 'uat' ? (`origin/release/${shopHandle}` as const) : null,
    'origin/main'
  ] as const
  await switchToBranch({
    git,
    logger,
    baseBranchCandidates: baseBranchCandidates.filter(isPresent),
    targetBranchName
  })

  await addEmptyCommit({
    logger,
    message: `Initiate deploy to ${target} @ ${shopHandle} (by ${devopsActor})`
  })

  logger.debug('Merging main branch into deployment branch')
  await mergeTheirs({
    logger,
    sourceBranch: 'origin/main'
  })

  // Clearing working copy just in case
  await clearWorkingCopy()

  if (target === 'dev-testing') {
    logger.info('Skipped theme content sync for dev-testing environment')
    return
  }

  const { mainTheme, targetTheme } = await findOrCreateTargetTheme({
    target,
    credentials: { accessToken, shop },
    logger
  })

  const contentSource:
    | { type: 'target-theme' | 'live-theme'; id: number; name: string }
    | { type: 'git' } =
    targetTheme.type === 'existing'
      ? { type: 'target-theme', id: targetTheme.id, name: targetTheme.name }
      : initialContentSource === 'live-theme'
        ? { type: 'live-theme', id: mainTheme.id, name: mainTheme.name }
        : { type: 'git' }

  logger.debug('Content source - {type}', { type: contentSource.type })

  if (contentSource.type === 'git') {
    await addEmptyCommit({
      logger,
      message: [
        'Skip theme content sync',
        'Content source set to "git" in deployment environment settings'
      ].join(EOL)
    })
    logger.info('Ready to populate the target theme', { theme: targetTheme })
    return
  }

  logger.debug('Preserving existing theme content', { source: contentSource })
  logger.trace('Fetching theme content')
  await fetchTheme({ themeId: contentSource.id, clean: true })

  const decorateCommitMessage = (message: string): [string, string] => {
    return [
      `${message} - ${contentSource.type} - ${contentSource.id}@${shopHandle}`,
      [
        `Store: ${shop}`,
        `Theme Name: ${contentSource.name}`,
        `Theme ID: ${contentSource.id}`,
        `Theme Type: ${contentSource.type}`,
        ...(contentOverridePatterns.length > 0
          ? [
              'Content Override Patterns:',
              ...contentOverridePatterns.map((pattern) => `- ${pattern}`)
            ]
          : [])
      ].join('\n')
    ]
  }

  /**
   * Preserve app content from GemPages, Replo, Shogun
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
          ...contentOverridePatterns,
          ':(glob)**/*gem-*-template*',
          ':(glob)snippets/gem-*',
          ':(glob)assets/gem-*'
        ]
      },
      { patterns: [...contentOverridePatterns, ':(glob)**/*replo*'] },
      {
        patterns: [
          ...contentOverridePatterns,
          ':(glob)snippets/shogun-*',
          ':(glob)sections/shogun-*',
          ':(glob)templates/*shogun*'
        ]
      }
    ],
    commitMessage: { mode: 'plain', line: 'Preserve app content' }
  })

  // `:(glob)` pathspec prefix enforces interpretation as gitignore pattern
  await addWithCommit({
    git,
    logger,
    decorateCommitMessage,
    pathspecs: [
      {
        patterns: [
          ...contentOverridePatterns,
          ':(glob)config/settings_data.json',
          ':(glob)locales/**/*.json',
          ':(glob)sections/**/*.json'
        ],
        skipDeleted: true
      },
      /**
       * Use content override patterns to specify which templates to force push to the target theme.
       */
      { patterns: [...contentOverridePatterns, ':(glob)templates/**/*.json'] }
    ],
    commitMessage: { mode: 'plain', line: 'Preserve theme content' }
  })

  await clearWorkingCopy()

  const summaryDetails = await logBranchDiffSummary({
    logger,
    theirBranchName: 'origin/main'
  })

  if (summaryDetails.length === 0) {
    await addEmptyCommit({
      logger,
      message: decorateCommitMessage(
        'Sync theme content - no difference detected'
      ).join(EOL)
    })
  }

  logger.info('Ready to populate the target theme', { theme: targetTheme })
}
