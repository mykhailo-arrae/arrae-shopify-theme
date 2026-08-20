import fs from 'node:fs/promises'
import Path from 'node:path'
import { z } from 'devops-zod4'
import { DeploymentTargetThemeNames } from '../../config/deployments.js'
import { DevOpsError } from '../../core/errors/index.js'
import type { Logger } from '../../core/logger/index.js'
import { createEmptyTheme } from '../../core/shopify/create-empty-theme.js'
import type { Theme } from '../../core/shopify/find-theme.js'
import { findTheme } from '../../core/shopify/find-theme.js'
import type { RuntimeConfig } from '../config/index.js'

export const TargetThemeDetails = z.object({
  __typename: z.literal('TargetTheme'),
  id: z.number().min(1),
  name: z.string().min(1),
  type: z.union([z.literal('existing'), z.literal('newly_created')])
})
export type TargetThemeDetails = z.infer<typeof TargetThemeDetails>

type Input = {
  target: RuntimeConfig['options']['target']
  credentials: { accessToken: string; shop: string }
  logger: Logger
}

export const findOrCreateTargetTheme = async ({
  target,
  credentials: { accessToken, shop },
  logger
}: Input): Promise<{ mainTheme: Theme; targetTheme: TargetThemeDetails }> => {
  const DETAILS_PERSIST_PATH = Path.resolve(
    '/tmp',
    `./target-theme-${target}.json`
  )

  const persistTargetThemeDetails = async (
    details: TargetThemeDetails
  ): Promise<void> => {
    await fs.writeFile(DETAILS_PERSIST_PATH, JSON.stringify(details, null, 2), {
      encoding: 'utf-8'
    })
  }

  const retrieveTargetThemeDetails =
    async (): Promise<TargetThemeDetails | null> => {
      const _data = await fs
        .readFile(DETAILS_PERSIST_PATH)
        .catch((err: unknown) => {
          logger.debug('Target theme details file cannot be read', {
            path: DETAILS_PERSIST_PATH,
            details: err instanceof Error ? err.message : null
          })

          return 'null'
        })

      const data = JSON.parse(_data.toString())

      return await TargetThemeDetails.nullable().parseAsync(data)
    }

  logger.debug('Finding the main theme')
  const { theme: mainTheme } = await findTheme({
    accessToken,
    shop,
    predicate: ({ role }) => role === 'main'
  })

  if (mainTheme == null) {
    throw new DevOpsError('Main theme not found', {
      shop,
      traceTag: '56c502c56f8e42eebeb094726b87b7f1'
    })
  }

  const targetThemeName = DeploymentTargetThemeNames[target]

  const restoredThemeReleaseDetails = await retrieveTargetThemeDetails()

  logger.debug('Finding or creating a target theme')
  const targetTheme: TargetThemeDetails = await findTheme({
    shop,
    accessToken,
    predicate: ({ name, role }) => {
      return role === 'unpublished' && name === targetThemeName
    }
  }).then(async ({ theme }): Promise<TargetThemeDetails> => {
    if (theme != null) {
      logger.info('Existing target theme found', { theme })

      /**
       * The theme might have been newly created in the previous step
       */
      const type: 'newly_created' | 'existing' =
        restoredThemeReleaseDetails == null
          ? 'existing'
          : restoredThemeReleaseDetails.id === theme.id &&
              restoredThemeReleaseDetails.type === 'newly_created'
            ? 'newly_created'
            : 'existing'

      return {
        type,
        __typename: 'TargetTheme',
        id: theme.id,
        name: theme.name
      }
    }

    logger.trace('No existing target theme found')
    logger.debug('Creating empty target theme')

    const nextTheme = await createEmptyTheme({
      shop,
      accessToken,
      name: targetThemeName
    })

    logger.info('Empty target theme created', { theme: nextTheme })

    return {
      __typename: 'TargetTheme',
      id: nextTheme.id,
      name: nextTheme.name,
      type: 'newly_created'
    }
  })

  await persistTargetThemeDetails(targetTheme)

  return {
    mainTheme,
    targetTheme
  }
}
