import { entries } from 'remeda'
import { saveNomnomlDiagramAsSvg } from '../../nomnoml/save-as-svg.js'
import { cartMachineConfig } from './index.js'

const run = async () => {
  const { states } = cartMachineConfig.definition

  const allTransitions =
    states == null
      ? []
      : entries(states).flatMap(([stateName, { on }]) => {
          if (on == null) {
            return []
          }

          return entries(on).flatMap(([, transitions]): string[] => {
            if (transitions == null) {
              return []
            }

            return transitions.flatMap((tr) => {
              if (tr.target == null) {
                return []
              }

              const eventType = tr.eventType.replace('xstate.', '')
              const transitionSymbol = eventType.startsWith('error')
                ? '-->'
                : '->'

              const eventShortName = eventType.startsWith('error')
                ? null
                : eventType
                    .replace('error.actor.', '')
                    .replace('done.actor.', '')

              return tr.target.map((stateNode) => {
                const target = stateNode.id.replace('(machine).', '')

                return [
                  `[${stateName}]`,
                  eventShortName,
                  transitionSymbol,
                  `[${target}]`
                ]
                  .filter((line) => line)
                  .join(' ')
              })
            })
          })
        })

  const nomnomlConfig = [
    `#title: Cart V2`,
    '#gravity: 2',
    '#edgeMargin: 10',
    '#padding: 16',
    '#spacing: 60',
    '#.event: visual=sender title=left,bold',
    '#.doneevent: visual=transceiver title=left',
    '#.errorevent: visual=receiver title=right'
  ] as const

  const input: string = [...nomnomlConfig, ...allTransitions].join('\n')

  await saveNomnomlDiagramAsSvg({ input, path: __filename })
}

run().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
