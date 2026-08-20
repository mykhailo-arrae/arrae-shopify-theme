#!/usr/bin/env bun

import { argv, env } from 'node:process'
import type { Subprocess } from 'bun'
import { JSON5, spawn } from 'bun'
import * as v from 'valibot'
import { DevOpsError } from './core/errors/index.js'
import { initLogger } from './core/logger/index.js'
import { makeLogErrorDetails } from './core/logger/log-error-details.js'

const logger = initLogger().with({ name: 'task-conveyor' })
const logErrorDetails = makeLogErrorDetails(logger)

const ExecEnv = v.record(v.string(), v.string())
type ExecEnv = v.InferOutput<typeof ExecEnv>

const Exec = v.tupleWithRest([v.pipe(v.string(), v.minLength(1))], v.string())
type Exec = v.InferOutput<typeof Exec>

const Task = v.object({
  t: v.literal('task'),
  env: v.optional(ExecEnv),
  exec: Exec
})
type Task = v.InferOutput<typeof Task>

const Breakpoint = v.object({
  t: v.literal('breakpoint'),
  env: v.optional(ExecEnv),
  exec: v.optional(Exec)
})
type Breakpoint = v.InferOutput<typeof Breakpoint>

const PlanItem = v.variant('t', [Task, Breakpoint])
type PlanItem = v.InferOutput<typeof PlanItem>

type Batch = { tasks: Task[]; breakpoint: Breakpoint | null }

const Config = v.pipe(
  v.object({
    plan: v.tupleWithRest([Task], PlanItem),
    finally: v.optional(Task)
  }),
  v.examples([
    {
      plan: [
        // Tasks are executed sequentially until a breakpoint is reached or the plan is exhausted
        // The exit codes are collected instead of failing early
        // The breakpoint exec runs regardless of the success or failure of the previous tasks
        // The breakpoint's exit code is counted towards the batch outcome
        { t: 'task', exec: ['echo', 'Good morning, world!'] },
        {
          t: 'task',
          env: { CI: '1' },
          exec: ['echo', 'Good afternoon, world!']
        },
        { t: 'breakpoint', exec: ['echo', 'Lunch break!'] },
        // The next batch is executed only if the previous batch was successful (including breakpoint's exec)
        { t: 'task', exec: ['echo', 'Back to work!'] },
        { t: 'breakpoint' },
        { t: 'task', exec: ['echo', 'Evening shift!'] }
      ],
      // The finally task is executed regardless of the success or failure of the plan
      finally: { t: 'task', exec: ['echo', 'Goodbye, world!'] }
    }
  ])
)
type Config = v.InferOutput<typeof Config>

const run = async (): Promise<void> => {
  const planController = new AbortController()
  const finallyController = new AbortController()

  const [, , rawConfigArg] = argv

  if (!rawConfigArg) {
    logger.error('Usage: task-conveyor.ts <json5-config>')
    process.exitCode = 1
    return
  }

  let parsedConfig: unknown
  try {
    parsedConfig = JSON5.parse(rawConfigArg)
  } catch {
    logger.error(
      'Failed to parse JSON5 config argument\nUsage: task-conveyor.ts <json5-config>'
    )
    process.exitCode = 1
    return
  }

  const configResult = v.safeParse(Config, parsedConfig)

  if (configResult.success === false) {
    logger.error(
      'Failed to parse config:\n{issues}\nExample config input:\n{example}',
      {
        issues: v.summarize(configResult.issues),
        example: JSON5.stringify(v.getExamples(Config)[0])
          ?.replaceAll('},', '},\n')
          .replaceAll('finally:', '\nfinally')
      }
    )
    throw new DevOpsError('Failed to parse config')
  }

  const config = configResult.output

  let shuttingDown = false
  let forcedShutdown = false
  const children = new Set<Subprocess>()

  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      logger.error('Forced shutdown (received {signal} twice)', { signal })
      forcedShutdown = true
      finallyController.abort()
      for (const child of children) {
        try {
          process.kill(child.pid, 'SIGKILL')
        } catch {
          logger.error('Process {pid} already exited', { pid: child.pid })
        }
      }
      process.exit(1)
    }
    logger.warn('Received {signal}, shutting down gracefully...', { signal })
    shuttingDown = true
    planController.abort()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  const runExec = async (
    exec: Exec,
    envOverrides?: ExecEnv,
    signal: AbortSignal = planController.signal
  ): Promise<number> => {
    if (signal.aborted) {
      return 130
    }

    if (exec[0] === 'bb' && exec[1] !== 'run') {
      throw new DevOpsError('Use `bb run` syntax to run subtasks', {
        cmd: exec.join(' ')
      })
    }

    const child = spawn(exec, {
      env: { ...env, ...envOverrides },
      stdin: 'ignore',
      stdout: 'inherit',
      stderr: 'inherit',
      signal,
      // In the context of the project, a task should never take more than 1 hour to complete
      // If it does, it will be clear it was a timeout
      timeout: 3_600_000
    })

    children.add(child)
    const exitCode = await child.exited.finally(() => {
      children.delete(child)
    })
    return exitCode
  }

  const splitIntoBatches = (plan: PlanItem[]): Batch[] => {
    const batches: Batch[] = []
    let currentTasks: Task[] = []

    for (const item of plan) {
      if (item.t === 'task') {
        currentTasks.push(item)
      } else {
        batches.push({ tasks: currentTasks, breakpoint: item })
        currentTasks = []
      }
    }

    if (currentTasks.length > 0) {
      batches.push({ tasks: currentTasks, breakpoint: null })
    }

    return batches
  }

  const batches = splitIntoBatches(config.plan).filter(
    (batch) => batch.tasks.length > 0
  )

  const allExitCodes: number[] = []

  try {
    for (const [i, batch] of batches.entries()) {
      logger.trace('Batch {index}/{total}', {
        index: i + 1,
        total: batches.length
      })

      const batchExitCodes: number[] = []

      for (const task of batch.tasks) {
        if (shuttingDown) {
          break
        }
        const exitCode = await runExec(task.exec, task.env)
        batchExitCodes.push(exitCode)
      }

      if (shuttingDown) {
        break
      }

      if (batch.breakpoint?.exec) {
        const exitCode = await runExec(
          batch.breakpoint.exec,
          batch.breakpoint.env
        )
        batchExitCodes.push(exitCode)
      }

      allExitCodes.push(...batchExitCodes)

      const batchFailed = batchExitCodes.some((code) => code !== 0)

      if (batchFailed) {
        logger.warn('Batch {index}/{total} failed, halting plan', {
          index: i + 1,
          total: batches.length
        })
        break
      }
    }
  } finally {
    if (config.finally) {
      if (forcedShutdown) {
        logger.error('Skipping finally task due to forced shutdown')
      } else {
        const { exec, env: envOverrides } = config.finally
        logger.trace('Running finally task')
        const exitCode = await runExec(
          exec,
          envOverrides,
          finallyController.signal
        )
        allExitCodes.push(exitCode)
      }
    }
  }

  const hasFailure = shuttingDown || allExitCodes.some((code) => code !== 0)

  if (hasFailure) {
    process.exitCode = 1
  }
}

run().catch((err: unknown) => {
  if (v.isValiError(err)) {
    logger.error('Validation error:\n{issues}', {
      issues: v.summarize(err.issues)
    })
    process.exitCode = 1
    return
  }

  logErrorDetails(err)
  process.exitCode = 1
})
