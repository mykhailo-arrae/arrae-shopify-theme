import { z } from 'devops-zod4'
import { DevOpsError } from '../core/errors/index.js'
import { initLogger } from '../core/logger/index.js'
import { ThemeRole } from '../core/shopify/theme-role.js'

export const ThemeInfo = z
  .object({
    admin_graphql_api_id: z.string().min(1),
    id: z.number().min(0),
    name: z.string().min(1),
    role: ThemeRole
  })
  .transform((themeInfo) => {
    return {
      ...themeInfo,
      translationApiId: themeInfo.admin_graphql_api_id.replace(
        '/Theme/',
        '/OnlineStoreTheme/'
      )
    }
  })
export type ThemeInfo = z.infer<typeof ThemeInfo>

export const SingleThemeResult = z
  .object({
    theme: ThemeInfo
  })
  .transform(({ theme }) => theme)

export type Input = {
  sourceThemeId: number
  targetThemeId: number
  env: { shop: string; accessToken: string }
  chunkSize?: number
}

export const syncThemeTranslations = async ({
  env: { accessToken, shop },
  sourceThemeId: _sourceThemeId,
  targetThemeId: _targetThemeId,
  chunkSize = 100
}: Input): Promise<void> => {
  const logger = initLogger()
  const { GraphQLClient, gql } = await import('graphql-request')
  const { default: got } = await import('got')
  const { empty, from, reduce } = await import(
    '@reactivex/ix-esnext-cjs/asynciterable/index.js'
  )
  const { flatMap, map, tap, concatMap, buffer, filter } = await import(
    '@reactivex/ix-esnext-cjs/asynciterable/operators/index.js'
  )

  const TranslatableContentQuery = gql`
    query getTranslatableContent($themeId: ID!) {
      theme: translatableResource(resourceId: $themeId) {
        translatableContent {
          key
          digest
        }
      }
    }
  `
  const TranslatableContent = z
    .object({
      theme: z.object({
        translatableContent: z.array(
          z.object({ key: z.string().min(1), digest: z.string().min(1) })
        )
      })
    })
    .transform((data) => data.theme.translatableContent)
  type TranslatableContent = z.infer<typeof TranslatableContent>

  const GetTranslationsQuery = gql`
    query getThemeTranslations($themeId: ID!, $locale: String!) {
      theme: translatableResource(resourceId: $themeId) {
        translations(locale: $locale, outdated: false) {
          key
          locale
          market {
            id
          }
          value
        }
      }
    }
  `
  const Translation = z
    .object({
      key: z.string().min(1),
      locale: z.string().min(2),
      market: z
        .object({
          id: z.string().min(1)
        })
        .nullable(),
      value: z.string().nullable()
    })
    .transform(({ market, ...props }) => {
      return {
        ...props,
        marketId: market?.id || null
      }
    })
  type Translation = z.infer<typeof Translation>
  const GetTranslationsData = z
    .object({
      theme: z.object({
        translations: z.array(Translation)
      })
    })
    .transform((data) => data.theme.translations)
    .describe('GetTranslationsData')
  type GetTranslationsData = z.infer<typeof GetTranslationsData>

  type TranslationInput = {
    key: string
    locale: string
    marketId: string | null
    translatableContentDigest: string
    value: string
  }
  const RegisterTranslationsMutation = gql`
    mutation registerTranslations(
      $themeId: ID!
      $translations: [TranslationInput!]!
    ) {
      translationsRegister(resourceId: $themeId, translations: $translations) {
        translations {
          key
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  `
  const RegisterTranslationsData = z
    .object({
      translationsRegister: z.object({
        translations: z.array(z.object({ key: z.string() })).nullable(),
        userErrors: z.array(
          z.object({
            code: z.string(),
            field: z.array(z.string()),
            message: z.string()
          })
        )
      })
    })
    .transform((data) => data.translationsRegister)
  type RegisterTranslationsData = z.infer<typeof RegisterTranslationsData>

  const client = new GraphQLClient(
    `https://${shop}/admin/api/2023-04/graphql.json`,
    {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    }
  )

  if (chunkSize > 100) {
    throw new DevOpsError(
      'Chunk size exceeds maximum payload limit of 100 translations',
      { chunkSize }
    )
  }

  const sourceTheme: ThemeInfo = await got(
    `https://${shop}/admin/api/2023-04/themes/${_sourceThemeId}.json?fields=admin_graphql_api_id,id,name,role`,
    {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    }
  )
    .json()
    .then((result) => {
      return SingleThemeResult.parseAsync(result)
    })

  const targetTheme: ThemeInfo = await got(
    `https://${shop}/admin/api/2023-04/themes/${_targetThemeId}.json?fields=admin_graphql_api_id,id,name,role`,
    {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    }
  )
    .json()
    .then((result) => {
      return SingleThemeResult.parseAsync(result)
    })

  logger.debug('Syncing theme translations', {
    source: sourceTheme.name,
    target: targetTheme.name
  })

  if (targetTheme.role === 'main') {
    throw new DevOpsError('Cannot modify the live theme', { targetTheme })
  }

  const locales = await client
    .request(
      gql`
        query getShopLocales {
          shopLocales {
            locale
            name
            primary
          }
        }
      `
    )
    .then(async (result) => {
      const Data = z
        .object({
          shopLocales: z.array(
            z.object({
              locale: z.string().min(2),
              name: z.string(),
              primary: z.boolean()
            })
          )
        })
        .transform(({ shopLocales }) => shopLocales)

      const items = await Data.parseAsync(result)

      return items.filter(({ primary }) => primary === false)
    })

  const content = await Promise.resolve([]).then(async () => {
    const source = await client
      .request(TranslatableContentQuery, {
        themeId: sourceTheme.translationApiId
      })
      .then(async (result) => {
        return await TranslatableContent.parseAsync(result)
      })

    const target = await client
      .request(TranslatableContentQuery, {
        themeId: targetTheme.translationApiId
      })
      .then(async (result) => {
        return await TranslatableContent.parseAsync(result)
      })

    return source.filter((sourceItem) =>
      target.some(
        (targetItem) =>
          targetItem.key === sourceItem.key &&
          targetItem.digest === sourceItem.digest
      )
    )
  })

  const pipeline = reduce(
    from(locales).pipe(
      tap(({ name, locale }) => {
        logger.debug('Processing {locale} locale', { locale, _name: name })
      }),
      concatMap(async (_locale) => {
        return from([_locale]).pipe(
          flatMap(async ({ locale }) => {
            logger.debug('Fetching source translations', { locale })
            const translations = await client
              .request(GetTranslationsQuery, {
                locale,
                themeId: sourceTheme.translationApiId
              })
              .then((d) => GetTranslationsData.parseAsync(d))

            logger.info('{count} source translations fetched', {
              locale,
              count: translations.length
            })

            logger.debug('Fetching existing translations', { locale })
            const existingTranslations = await client
              .request(GetTranslationsQuery, {
                locale,
                themeId: targetTheme.translationApiId
              })
              .then((d) => GetTranslationsData.parseAsync(d))

            logger.info('{count} existing translations fetched', {
              locale,
              count: existingTranslations.length
            })

            return from(translations).pipe(
              filter((t) => {
                const existingTranslation = existingTranslations.find((et) => {
                  return (
                    et.key === t.key &&
                    et.locale === t.locale &&
                    et.marketId === t.marketId &&
                    et.value === t.value
                  )
                })

                if (existingTranslation != null) {
                  logger.trace(
                    'Skipping existing translation: {key} [{locale}]',
                    { key: t.key, locale: t.locale }
                  )
                  return false
                }
                return true
              })
            )
          }),
          flatMap(async (_translation) => {
            const { key, locale, marketId, value } = _translation
            const translatableContentDigest = content.find(
              (contentItem) => contentItem.key === key
            )?.digest

            if (value == null) {
              logger.trace(
                'Skipping translation with empty value: {key} [{locale}]',
                { key, locale }
              )
              return empty()
            }

            if (translatableContentDigest == null) {
              logger.trace(
                'Skipping translation with outdated content digest: {key} [{locale}]',
                { key, locale }
              )
              return empty()
            }

            return from<TranslationInput>([
              {
                key,
                locale,
                value,
                marketId,
                translatableContentDigest
              }
            ])
          }),
          tap(({ key, locale }) => {
            logger.trace('Registering translation: {key} [{locale}]', {
              key,
              locale
            })
          }),
          buffer(chunkSize),
          map(async (translations): Promise<RegisterTranslationsData> => {
            return await client
              .request(RegisterTranslationsMutation, {
                translations,
                themeId: targetTheme.translationApiId
              })
              .then((d) => {
                return RegisterTranslationsData.parseAsync(d)
              })
          }),
          tap(async ({ translations, userErrors }) => {
            if (userErrors.length === 0) {
              logger.info('{count} translations registered', {
                count: translations?.length || 0
              })
              return
            }
            const userErrorCode = userErrors[0]?.code || 'UNKNOWN'
            const userErrorMessage =
              userErrors[0]?.message || 'Unknown user error'

            logger.error(
              'Some translations cannot be registered: {userErrorCode} {userErrorMessage}',
              { userErrorCode, userErrorMessage, userErrors }
            )
            throw new DevOpsError(
              `Some translations cannot be registered: ${userErrorCode} ${userErrorMessage}`,
              { targetTheme }
            )
          })
        )
      })
    ),
    {
      callback(acc, current) {
        return {
          totalProcessed:
            acc.totalProcessed + (current.translations?.length || 0)
        }
      },
      seed: { totalProcessed: 0 }
    }
  )

  const { totalProcessed } = await pipeline

  logger.info('All tasks completed - {totalProcessed} translations processed', {
    totalProcessed
  })
}
