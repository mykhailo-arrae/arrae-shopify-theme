import { connect } from 'stent/lib/helpers'

export type CleanupFn = () => void

export const onStateChange = <S>(
  machine: { name: string; state: S },
  callback: (state: S) => void
): CleanupFn => {
  return connect<typeof machine>()
    .with(machine.name)
    .map((m) => {
      callback(m.state)
    })
}
