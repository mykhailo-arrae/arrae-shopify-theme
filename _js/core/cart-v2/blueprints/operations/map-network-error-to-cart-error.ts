import { CoreNetworkError } from '../../../network/core-network-error.js'
import { parseShopifyErrorResponse } from '../../../network/shopify-error-response.js'
import { CartCommunicationError } from '../errors/cart-communication-error.js'
import { CartUserError } from '../errors/cart-user-error.js'

export const makeMapNetworkErrorToCartError =
  ({
    userErrorMessage,
    communicationErrorMessage
  }: {
    userErrorMessage: string
    communicationErrorMessage: string
  }) =>
  (networkErr: unknown): Promise<never> => {
    if (networkErr instanceof CoreNetworkError) {
      const errorResponse = parseShopifyErrorResponse(
        networkErr.details.errorResponse
      )

      if (errorResponse) {
        throw new CartUserError(userErrorMessage, {
          cause: networkErr,
          description:
            errorResponse.description ||
            errorResponse.message ||
            'Unknown API error',
          metadata: {
            errorResponse
          }
        })
      }
    }

    throw new CartCommunicationError(communicationErrorMessage, {
      cause: networkErr,
      description:
        networkErr instanceof Error
          ? networkErr.message
          : typeof networkErr === 'string' && networkErr.length > 0
            ? networkErr
            : 'Unknown network error'
    })
  }
