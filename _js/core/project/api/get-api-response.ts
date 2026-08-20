import { AppError } from '../../errors/app-error.js'
import { CoreNetworkError } from '../../network/core-network-error.js'
import { type GetJsonInput, getJson } from '../../network/get-json.js'
import type { JSONValue } from '../../typescript/json-value.js'

export type GetApiResponseInput = GetJsonInput

/**
 * Same GET + JSON + native-fetch fallback as {@link getJson}; wraps errors in
 * {@link AppError} for project API callers (vs {@link CoreNetworkError} from core network).
 */
export const getApiResponse = async (
  input: GetApiResponseInput
): Promise<JSONValue> => {
  try {
    return await getJson(input)
  } catch (err) {
    if (err instanceof CoreNetworkError) {
      throw new AppError(err.message, {
        url: err.details.url,
        errorResponse: err.details.errorResponse,
        status: err.details.status,
        method: err.details.method,
        source: 'core/project/api/get-api-response'
      })
    }
    throw err
  }
}
