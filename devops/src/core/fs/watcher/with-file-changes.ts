import Path from 'node:path'
import { initLogger } from '../../logger/index.js'
import { makeLogErrorDetails } from '../../logger/log-error-details.js'
import { workdir as cwd } from '../../process/workdir.js'
import { entries } from '../../typescript/entries.js'
import type { WatchEvent, WatchEventType } from './events.js'

export type Task = {
  name: string
  exec: (events?: WatchEvent[]) => Promise<void>
}

const logger = initLogger().with({ name: 'file-watcher' })
const logErrorDetails = makeLogErrorDetails(logger)

export const handleError = (_err: unknown): never => {
  const err = logErrorDetails(_err)

  throw err
}

export const withFileChanges = async (tasks: Task[]): Promise<void> => {
  const {
    WATCHEXEC_COMMON_PATH,
    WATCHEXEC_CREATED_PATH,
    WATCHEXEC_REMOVED_PATH,
    WATCHEXEC_RENAMED_PATH,
    WATCHEXEC_WRITTEN_PATH
  } = process.env

  const _events: Record<WatchEventType, string | undefined> = {
    write: WATCHEXEC_WRITTEN_PATH,
    rename: WATCHEXEC_RENAMED_PATH,
    remove: WATCHEXEC_REMOVED_PATH,
    create: WATCHEXEC_CREATED_PATH
  } as const

  const events: WatchEvent[] = entries(_events).flatMap(
    ([type, _value]): WatchEvent[] => {
      if (_value == null) {
        return []
      }

      return _value.split(Path.delimiter).flatMap((_path) => {
        if (_path.length === 0) {
          return []
        }

        return [
          {
            type,
            path: Path.relative(
              cwd,
              WATCHEXEC_COMMON_PATH
                ? Path.resolve(WATCHEXEC_COMMON_PATH, _path)
                : _path
            )
          }
        ]
      })
    }
  )

  for (const task of tasks) {
    try {
      logger.debug('Running {name} task', { name: task.name })
      await task.exec(events)
    } catch (err) {
      logErrorDetails(err)
      logger.error('Task {name} failed', { name: task.name, events })
    }
  }
}
