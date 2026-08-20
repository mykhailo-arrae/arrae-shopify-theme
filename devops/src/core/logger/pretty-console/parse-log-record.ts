import SuperJSON from 'superjson'
import { formatMessageLines } from './format-message-lines.js'

export type Input = {
  message: readonly unknown[]
  properties: Record<string, unknown>
}

export type Output = {
  messageLines: string[]
  details: Record<string, unknown>
}

/**
 * Convert a LogTape log record into a string message and a set of details that are not printed as part of the message.
 */
export const parseLogRecord = ({
  message: messageParts,
  properties
}: Input): Output => {
  const msg = messageParts
    .map((mPart): string | number => {
      if (mPart === null) {
        return JSON.stringify('{NULL}')
      }

      if (typeof mPart === 'string') {
        return mPart
      }

      const { json } = SuperJSON.serialize(mPart)

      return JSON.stringify(json, null, 2)
        .split('\n')
        .map((line) => line.trim())
        .join(' ')
        .trim()
    })
    .join('')

  const messageLines = formatMessageLines({ msg, sublineIndent: 2 })

  const details = Object.fromEntries(
    Object.entries(properties).flatMap(([key, value]) => {
      // Always show the error property
      if (key === 'err' || key === 'error') {
        return [[key, value]]
      }

      // Skip name property because it's shown as line prefix
      if (key === 'name') {
        return []
      }

      const isUsedInMessage = messageParts.some((part) => {
        return part === value
      })

      // Skip properties that are printed in the message
      if (isUsedInMessage) {
        return []
      }

      return [[key, value]]
    })
  )

  return { messageLines, details }
}
