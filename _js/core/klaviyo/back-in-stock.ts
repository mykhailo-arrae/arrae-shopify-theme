const KLAVIYO_BIS_URL =
  'https://a.klaviyo.com/client/back-in-stock-subscriptions/?company_id='
const KLAVIYO_BIS_REVISION = '2024-06-15'

export type BackInStockSubscribeParams = {
  email: string
  phone?: string
  variantId: number
  publicApiKey: string
}

export const buildKlaviyoCatalogVariantId = (variantId: number): string =>
  `$shopify:::$default:::${variantId}`

export const subscribeBackInStock = async ({
  email,
  phone,
  variantId,
  publicApiKey
}: BackInStockSubscribeParams): Promise<Response> => {
  const trimmedPhone = phone?.trim() ?? ''

  return fetch(`${KLAVIYO_BIS_URL}${publicApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      revision: KLAVIYO_BIS_REVISION
    },
    body: JSON.stringify({
      data: {
        type: 'back-in-stock-subscription',
        attributes: {
          profile: {
            data: {
              type: 'profile',
              attributes: {
                email,
                ...(trimmedPhone.length > 0
                  ? { phone_number: trimmedPhone }
                  : {})
              }
            }
          },
          channels: trimmedPhone.length > 0 ? ['EMAIL', 'SMS'] : ['EMAIL']
        },
        relationships: {
          variant: {
            data: {
              type: 'catalog-variant',
              id: buildKlaviyoCatalogVariantId(variantId)
            }
          }
        }
      }
    })
  })
}

export const isBackInStockSubscriptionAccepted = (
  response: Response
): boolean => response.status === 202
