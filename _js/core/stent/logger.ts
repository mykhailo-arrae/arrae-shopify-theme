import { Machine } from 'stent'
import { AppError } from '../errors/app-error.js'

let activated = false

export const activateMachineLogger = (): void => {
  if (activated) {
    return
  }

  Machine.addMiddleware({
    onStateChanged() {
      const isFailureState: boolean = this.state.name
        .toLowerCase()
        .includes('failure')

      if (isFailureState) {
        console.warn(
          `"${this.name}" machine state changed to ${this.state.name}`
        )
      }

      const _err = 'error' in this.state ? this.state.error : null
      const err =
        _err instanceof Error
          ? _err
          : typeof _err === 'string'
            ? new Error(_err)
            : null

      if (err) {
        console.error(err, err instanceof AppError ? err.details : null)
      }
    }
  })

  activated = true
}
