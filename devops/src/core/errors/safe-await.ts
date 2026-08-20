import { DevOpsError } from './index.js'

export const safeAwait = async <T>(
  promise: Promise<T>
): Promise<[error: null, data: T] | [error: Error, data: null]> => {
  try {
    const data = await promise

    return [null, data]
  } catch (_err: unknown) {
    const err =
      _err instanceof Error
        ? _err
        : typeof _err === 'string'
          ? new DevOpsError(
              `Error: ${_err.length > 80 ? _err.slice(0, 80) : _err || 'Unknown error'}`,
              { err: _err }
            )
          : new DevOpsError('Unknown error', { err: _err })

    return [err, null]
  }
}
