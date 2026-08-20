import {
  type Client,
  cacheExchange,
  createClient,
  errorExchange,
  fetchExchange
} from '@urql/core'
import { retryExchange } from '@urql/exchange-retry'
import { DevOpsError } from '../../core/errors/index.js'
import { initLogger } from '../../core/logger/index.js'
import { ShopifyCliCredentials } from '../../core/shopify/cli-credentials.js'

export { type AnyVariables, type Client } from '@urql/core'

export const API_VERSION = '2025-04'

export const makeThemeAccessClient = async (): Promise<{
  client: Client
  shop: string
}> => {
  const logger = initLogger().with({ name: 'theme-access' })

  const envResult = await ShopifyCliCredentials.safeParseAsync(process.env)

  if (!envResult.success) {
    throw new DevOpsError('Shopify theme access credentials are invalid', {
      issues: envResult.error.issues
    })
  }

  const { shop, accessToken } = envResult.data

  const isAdminApiAccessToken = accessToken.startsWith('shpat_')

  if (isAdminApiAccessToken) {
    logger.warn('Using Admin API access token')
  }

  const url = isAdminApiAccessToken
    ? `https://${shop}/admin/api/${API_VERSION}/graphql.json`
    : `https://theme-kit-access.shopifyapps.com/cli/admin/api/${API_VERSION}/graphql.json`

  const baseHeaders: Record<string, string> = isAdminApiAccessToken
    ? {
        'X-Shopify-Access-Token': accessToken
      }
    : {
        'X-Shopify-Shop': shop,
        'X-Shopify-Access-Token': accessToken
      }

  const client = createClient({
    url,
    fetchOptions: { headers: baseHeaders },
    requestPolicy: 'network-only',
    exchanges: [
      cacheExchange,
      retryExchange({
        initialDelayMs: 1000,
        maxDelayMs: 10_000,
        maxNumberAttempts: 3,
        randomDelay: true,
        retryIf: (err) => {
          if (err.networkError) {
            logger.debug('Retrying due to network error: {message}', {
              message: err.networkError.message
            })
            return true
          }
          return false
        }
      }),
      errorExchange({
        onError: (error, operation) => {
          const { graphQLErrors, networkError } = error

          if (networkError) {
            const retryCount =
              typeof operation.context.retry === 'number'
                ? operation.context.retry
                : undefined

            logger.error('Network error: {message}', {
              retryCount,
              message: networkError.message,
              kind: operation.kind,
              url: operation.context.url
            })
          }

          if (graphQLErrors.length > 0) {
            const messageList = graphQLErrors
              .map(({ message, extensions, path }) => {
                const code =
                  typeof extensions.code === 'string'
                    ? extensions.code
                    : 'UNKNOWN'
                return `- ${code} - ${message} @ ${path?.join('.') ?? 'unknown'}`
              })
              .join('\n')

            logger.warn('GraphQL errors: {messageList}', {
              messageList
            })
          }
        }
      }),
      fetchExchange
    ]
  })

  return {
    client,
    shop
  }
}
