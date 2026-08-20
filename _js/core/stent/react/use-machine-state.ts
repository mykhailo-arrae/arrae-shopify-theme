import { useEffect, useState } from 'react'
import { connect } from 'stent/lib/helpers'

export const useMachineState = <S>(machine: { name: string; state: S }): S => {
  const [state, setState] = useState<S>(machine.state)

  useEffect(
    () =>
      connect<typeof machine>()
        .with(machine.name)
        .map((m) => {
          setState(m.state)
        }),
    [machine.name]
  )

  return state
}
