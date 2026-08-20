import { EOL } from 'node:os'
import { DevOpsError } from '../../core/errors/index.js'
import { safeAwait } from '../../core/errors/safe-await.js'
import { addEmptyCommit } from '../../core/git/add-empty-commit.js'
import type { Logger } from '../../core/logger/index.js'
import { pushToTheme } from '../../core/shopify/push-to-theme.js'
import { syncThemeTranslations } from '../../sync-theme-translations/main.js'
import type { RuntimeConfig } from '../config/index.js'
import { findOrCreateTargetTheme } from './find-or-create-target-theme.js'

export type Input = {
  logger: Logger
  target: RuntimeConfig['options']['target']
  credentials: { accessToken: string; shop: string; shopHandle: string }
}

export const populateTargetTheme = async ({
  logger,
  target,
  credentials: { accessToken, shop, shopHandle }
}: Input): Promise<void> => {
  logger.debug('Parsing configuration')

  const { mainTheme, targetTheme } = await findOrCreateTargetTheme({
    target,
    credentials: { accessToken, shop },
    logger
  })

  const themeId = targetTheme.id

  // Shopify CLI mixes up the order of the uploads
  // so we need to manually upload the file groups in the correct order

  logger.debug('Populating release theme')
  logger.trace('Uploading snippets')
  await pushToTheme({
    logger,
    themeId,
    globs: ['snippets/**/*.liquid']
  })
  logger.trace('Uploading blocks')
  await pushToTheme({
    logger,
    themeId,
    globs: ['blocks/**/*.liquid']
  })
  logger.trace('Uploading sections')
  await pushToTheme({
    logger,
    themeId,
    globs: ['sections/**/*.liquid']
  })
  logger.trace('Uploading section groups')
  await pushToTheme({
    logger,
    themeId,
    globs: ['sections/**/*.json']
  })
  logger.trace('Uploading layouts')
  await pushToTheme({
    logger,
    themeId,
    globs: ['layout/**/*.liquid']
  })
  logger.trace('Uploading the rest of the files')
  await pushToTheme({
    logger,
    themeId,
    globs: null
  })

  if (targetTheme.type === 'newly_created') {
    logger.debug('Syncing theme translations')
    const [err] = await safeAwait(
      syncThemeTranslations({
        env: { accessToken, shop },
        sourceThemeId: mainTheme.id,
        targetThemeId: targetTheme.id
      })
    )

    if (err) {
      throw new DevOpsError('Failed to sync theme translations', {
        err,
        sourceTheme: mainTheme,
        targetTheme,
        traceTag: 'a3dcc22ce0024ffd94307e5699c07f9f'
      })
    }
  }

  await addEmptyCommit({
    logger,
    message: [
      `Deploy to ${target} successfully - ${targetTheme.id}@${shopHandle}`,
      '',
      `Store: ${shop}`,
      `Theme Name: ${targetTheme.name}`,
      `Theme ID: ${targetTheme.id}`
    ].join(EOL)
  })

  logger.info('Release theme populated', { theme: targetTheme })
}
