import glogg from 'glogg'
import { initLogger } from '../../core/logger/index.js'
import { isPlainObject } from '../../core/typescript/is-plain-object.js'

const replacer = (_: unknown, value: unknown): unknown => {
  if (typeof value === 'symbol') {
    return value.description ?? 'symbol'
  }

  return value
}

export const customizeGulpLogs = (): void => {
  const logger = initLogger().with({ name: 'gulp' })

  const gulplog = glogg('gulplog')

  // Remove default listeners
  gulplog.removeAllListeners()

  // Add your custom handlers
  gulplog.on('info', (_payload: unknown) => {
    if (isPlainObject(_payload) === false) {
      return
    }

    const { tag: _tag, task: _task } = _payload

    const tag = typeof _tag === 'symbol' ? _tag.description : null

    if (tag === 'GULP_CLI_GULPFILE') {
      logger.trace('Gulpfile found')
      return
    }

    const task = typeof _task === 'string' ? _task : null

    if (task == null) {
      return
    }

    const action =
      tag === 'GULP_CLI_TASK_START'
        ? 'started'
        : tag === 'GULP_CLI_TASK_STOP'
          ? 'finished'
          : null

    if (action == null) {
      return
    }

    logger.debug('Task {action}: {task}', {
      task,
      action
    })
  })

  gulplog.on('warn', (...args) => {
    logger.warn('{args}', { args: JSON.stringify(args, replacer) })
  })

  gulplog.on('error', (...args) => {
    logger.error('{args}', { args: JSON.stringify(args, replacer) })
  })
}
