import { inspect, styleText } from 'node:util'
import type { LogLevel, LogRecord } from '@logtape/logtape'
import { parseLogRecord } from './parse-log-record.js'

const colorOptions = {
  // Force colors to be enabled even if the stream is not a TTY
  validateStream: false
} as const

const dimCyan = (text: string): string => {
  return styleText(['dim', 'cyan'], text, colorOptions)
}

const cyan = (text: string): string => {
  return styleText(['cyan'], text, colorOptions)
}

const yellow = (text: string): string => {
  return styleText(['yellow'], text, colorOptions)
}

const red = (text: string): string => {
  return styleText(['red'], text, colorOptions)
}

const magenta = (text: string): string => {
  return styleText(['magenta'], text, colorOptions)
}

const fatalColor = (text: string): string => {
  return styleText(['bgRed', 'black'], text, colorOptions)
}

const PROP_INDENT = Array.from({ length: 2 }, () => ' ').join('')

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
})

const convertLevelToNumeric = (level: LogLevel): number => {
  return level === 'trace'
    ? 10
    : level === 'debug'
      ? 20
      : level === 'info'
        ? 30
        : level === 'warning'
          ? 40
          : level === 'error'
            ? 50
            : level === 'fatal'
              ? 60
              : (() => {
                  level satisfies never
                  return 0
                })()
}

const paintLevel = (level: number): string => {
  const logLabel =
    level === 10
      ? 'TRC'
      : level === 20
        ? 'DBG'
        : level === 30
          ? 'INF'
          : level === 40
            ? 'WRN'
            : level === 50
              ? 'ERR'
              : level === 60
                ? 'FTL'
                : 'LVL'

  return level >= 60
    ? fatalColor(logLabel)
    : level >= 50
      ? red(logLabel)
      : level >= 40
        ? yellow(logLabel)
        : dimCyan(logLabel)
}

const paintName = ({
  name,
  level
}: {
  name: unknown
  level: number
}): string => {
  if (typeof name !== 'string') {
    return 'devops'
  }

  if (name.length === 0) {
    return 'devops'
  }

  const formattedName = `(${name})`

  return level >= 40 ? cyan(formattedName) : dimCyan(formattedName)
}

const paintTime = ({
  level,
  timestamp
}: {
  level: number
  timestamp: number
}): string => {
  const _formattedTime = timeFormatter.format(new Date(timestamp))

  const formattedTime = `[${_formattedTime}]`

  return level >= 40 ? cyan(formattedTime) : dimCyan(formattedTime)
}

const paintMessage = ({
  messageLines,
  level
}: {
  messageLines: string[]
  level: number
}): string => {
  const message = messageLines
    .map((line) => {
      return level <= 30
        ? dimCyan(line)
        : level >= 50
          ? magenta(line)
          : cyan(line)
    })
    .join('\n')

  return message
}

const paintDetails = (details: Record<string, unknown>): string[] => {
  const detailLines = Object.entries(details).flatMap(
    ([key, value]): string[] => {
      if (value == null) {
        return []
      }

      const formattedValue = inspect(value, {
        depth: 3,
        colors: false,
        numericSeparator: true,
        sorted: true
      })
        .split('\n')
        .map((line, lineIndex): string => {
          if (lineIndex === 0) {
            return line
          }

          return [PROP_INDENT, line].join('')
        })
        .map((line) => {
          return dimCyan(line)
        })
        .join('\n')
        .trim()

      const line = [
        PROP_INDENT,
        key === 'err' || key === 'error' ? red(key) : dimCyan(key),
        dimCyan(': '),
        formattedValue
      ].join('')

      return [line]
    }
  )

  return detailLines
}

export const prettyConsoleFormatter = (line: LogRecord): string => {
  const {
    level: _level,
    timestamp,
    properties: { name }
  } = line

  const level = convertLevelToNumeric(_level)

  const { messageLines, details } = parseLogRecord(line)

  const mainLine = [
    paintTime({ level, timestamp }),
    paintLevel(level),
    paintName({ level, name }),
    paintMessage({
      level,
      messageLines
    })
  ].join(' ')

  const lines = [mainLine, ...paintDetails(details)]

  return lines.join('\n')
}
