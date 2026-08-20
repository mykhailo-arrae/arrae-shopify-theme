import { readFile } from 'node:fs/promises'
import Path from 'node:path'
import { from, reduce } from '@reactivex/ix-esnext-cjs/asynciterable/index.js'
import {
  buffer,
  distinct,
  filter,
  tap
} from '@reactivex/ix-esnext-cjs/asynciterable/operators/index.js'
import { DevOpsError } from '../../core/errors/index.js'
import { safeAwait } from '../../core/errors/safe-await.js'
import type { WatchEvent } from '../../core/fs/watcher/events.js'
import type { Task } from '../../core/fs/watcher/with-file-changes.js'
import { initLogger } from '../../core/logger/index.js'
import { workdir } from '../../core/process/workdir.js'
import { makeThemeAccessClient } from './client.js'
import { discoverDevThemeId } from './discover-dev-theme-id.js'
import {
  FindTheme,
  FindThemeData,
  type FindThemeVariables
} from './operations/find-theme.js'
import {
  type UpsertFilePayload,
  UpsertThemeFiles,
  UpsertThemeFilesData,
  type UpsertThemeFilesVariables
} from './operations/upsert-theme-files.js'

const NAME = 'upload-to-shopify'

const logger = initLogger().with({ name: NAME })

const loadUpsertFile = async (filename: string): Promise<UpsertFilePayload> => {
  const contents = await readFile(Path.resolve(workdir, filename))
  const value = contents.toString('base64')

  return {
    filename,
    body: {
      type: 'BASE64',
      value
    }
  }
}

export const uploadToShopifyV2: Task = {
  name: NAME,
  exec: async (allEvents = []) => {
    logger.trace('Using Theme Access API for theme file uploads')

    if (allEvents.length === 0) {
      return
    }

    const { client, shop } = await makeThemeAccessClient()

    const [discoverDevThemeConfigError, devThemeConfig] = await safeAwait(
      discoverDevThemeId({ shop })
    )

    if (discoverDevThemeConfigError) {
      logger.warn(
        'Dev theme config is invalid, run `bb deploy-dev` to initialize your development theme'
      )
      throw discoverDevThemeConfigError
    }

    const { shortThemeId, themeId } = devThemeConfig

    const destTheme = await client
      .query<unknown, FindThemeVariables>(FindTheme, { themeId })
      .toPromise()
      .then((response) => {
        if (response.error) {
          logger.error(
            'Failed to find virtual theme. Run `bb deploy-dev` to initialize your development theme'
          )
          throw new DevOpsError('Failed to find theme', {
            themeId
          })
        }

        const result = FindThemeData.safeParse(response.data)

        if (result.success === false) {
          throw new DevOpsError('Failed to parse virtual theme data', {
            data: response.data,
            issues: result.error.issues
          })
        }

        return result.data.theme
      })

    logger.trace('Found virtual theme {destThemeName}', {
      destThemeName: destTheme.name
    })

    const pipeline = reduce<WatchEvent[], number>(
      from(allEvents).pipe(
        distinct({
          comparer: (x, y) => {
            return x.path === y.path
          }
        }),
        tap(({ type, path }) => {
          const humanReadableEventType =
            type === 'remove'
              ? 'deleted'
              : type === 'create'
                ? 'added'
                : 'changed'

          logger.trace('{path} was {humanReadableEventType} locally', {
            path,
            humanReadableEventType
          })
        }),
        filter((evt) => evt.type !== 'remove'),
        buffer(3),
        tap(async (events): Promise<void> => {
          if (events.length === 0) {
            return
          }

          const filenames = events.map(({ path }) => path)

          const variables: UpsertThemeFilesVariables = {
            themeId,
            files: await Promise.all(filenames.map(loadUpsertFile))
          }

          const response = await client
            .mutation<unknown, UpsertThemeFilesVariables>(
              UpsertThemeFiles,
              variables
            )
            .toPromise()

          if (response.error) {
            throw new DevOpsError('Failed to upload to Shopify', {
              themeId,
              filenames
            })
          }

          const mutationResult = UpsertThemeFilesData.safeParse(response.data)

          if (!mutationResult.success) {
            throw new DevOpsError('Failed to parse upload results', {
              data: response.data,
              issues: mutationResult.error.issues,
              themeId,
              filenames
            })
          }

          const {
            themeFilesUpsert: { upsertedThemeFiles, userErrors }
          } = mutationResult.data

          if (userErrors.length > 0) {
            const firstUserError = userErrors[0]

            throw new DevOpsError(
              `Failed to upload to Shopify: ${firstUserError?.message || 'Unknown user error'}`,
              {
                userErrors,
                themeId,
                filenames
              }
            )
          }

          logger.trace('{count} files uploaded to Shopify', {
            count: upsertedThemeFiles.length
          })
        })
      ),
      {
        callback: (acc, events) => {
          return acc + events.length
        },
        seed: 0
      }
    )

    const totalUploaded = await pipeline

    const previewUrl = `https://${shop}?preview_theme_id=${shortThemeId}`
    const editorUrl = `https://${shop}/admin/themes/${shortThemeId}/editor`

    logger.info(
      '{count} {pluralizedFiles} uploaded to Shopify\n- Preview: {previewUrl}\n- Editor: {editorUrl}',
      {
        count: totalUploaded,
        pluralizedFiles: totalUploaded === 1 ? 'file' : 'files',
        previewUrl,
        editorUrl
      }
    )
  }
}
