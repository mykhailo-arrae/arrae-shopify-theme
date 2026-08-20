import type { Operations } from '../../operations/index.js'
import type { Context } from '../context/index.js'
import type { MachineEvent } from '../events/index.js'

export type { Operations } from '../../operations/index.js'

export type MakeEpic<
  Ops extends Partial<Operations>,
  Payload,
  Output
> = (config: { Operations: Ops }) => (props: {
  payload: Payload
  prevContext: Context
  /**
   * XState will pass an AbortSignal to the epic.
   * https://stately.ai/docs/promise-actors#stopping-promise-actors
   */
  signal: AbortSignal
}) => Promise<Output>

export const makeEpicWithCallback = <
  Ops extends Partial<Operations>,
  Payload,
  Output
>({
  makeEpic,
  mapInput
}: {
  makeEpic: MakeEpic<Ops, Payload, Output>
  /**
   * The primary role of mapInput is to narrow down the event type and extract the async callback from the event payload.
   * It should not be used to transform the context.
   */
  mapInput: (input: { event: MachineEvent }) => {
    payload: Payload
    cb?: {
      resolve: (value: undefined) => void
      reject: (reason: unknown) => void
    }
  }
}) => {
  return (config: { Operations: Ops }) => {
    const epic = makeEpic(config)

    return async ({
      input: { event, context },
      signal
    }: {
      input: {
        event: MachineEvent
        context: Context
      }
      signal: AbortSignal
    }): Promise<Output> => {
      const { payload, cb } = mapInput({ event })

      try {
        const result = await epic({
          payload,
          prevContext: context,
          signal
        })

        // The caller should only know when the epic is done,
        // they should use cart state and actions to interpret the results
        cb?.resolve(undefined)
        return result
      } catch (err: unknown) {
        cb?.reject(err)
        throw err
      }
    }
  }
}
