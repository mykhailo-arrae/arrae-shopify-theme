import type { Logger } from '../logger/index.js'
import { makeLogErrorDetails } from '../logger/log-error-details.js'

export const makeHandleRejection = ({
  logger
}: {
  logger: Logger
}): ((err: unknown) => never) => {
  const logErrorDetails = makeLogErrorDetails(logger)

  return (_err: unknown) => {
    throw logErrorDetails(_err)
  }
}
