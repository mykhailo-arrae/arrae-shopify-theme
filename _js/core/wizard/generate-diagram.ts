import { isPresent } from '../typescript/guards.js'

type BaseNav =
  | {
      type: 'head'
      next: { targets: string[] }
      previous: null
    }
  | {
      type: 'tail'
      next: null
      previous: { targets: string[] }
    }
  | {
      type: 'node'
      next: { targets: string[] }
      previous: { targets: string[] }
    }

type BaseWizard = {
  allSteps: Record<string, { step: string; nav: BaseNav }>
}

export const generateWizardDiagram = ({
  wizard,
  diagramName = 'Wizard',
  direction = 'down'
}: {
  wizard: BaseWizard
  diagramName?: string
  direction?: 'down' | 'right'
}): string => {
  const transitions = Object.values(wizard.allSteps).flatMap(
    ({ step, nav }) => {
      if (nav.type === 'head') {
        const targets =
          nav.next.targets.length > 1
            ? [
                `[${step}] -> [<choice> ${step}-next]`,
                ...nav.next.targets.map((tr) => {
                  return `[${step}-next] -> [${tr}]`
                })
              ]
            : [`[${step}] -> [${nav.next.targets[0]}]`]

        return [`[<start> ${step}-start] -> [${step}]`, ...targets].filter(
          isPresent
        )
      }

      if (nav.type === 'tail') {
        const prevTargets =
          nav.previous.targets.length > 1
            ? [
                `[${step}] --> [<choice> ${step}-previous]`,
                ...nav.previous.targets.map((tr) => {
                  return `[${step}-previous] --> [${tr}]`
                })
              ]
            : [`[${step}] --> [${nav.previous.targets[0]}]`]

        return [...prevTargets, `[${step}] -> [<end> ${step}-end]`].filter(
          isPresent
        )
      }

      nav.type satisfies 'node'

      const nextTargets =
        nav.next.targets.length > 1
          ? [
              `[${step}] -> [<choice> ${step}-next]`,
              ...nav.next.targets.map((tr) => {
                return `[${step}-next] -> [${tr}]`
              })
            ]
          : [`[${step}] -> [${nav.next.targets[0]}]`]

      const prevTargets =
        nav.previous.targets.length > 1
          ? [
              `[${step}] --> [<choice> ${step}-previous]`,
              ...nav.previous.targets.map((tr) => {
                return `[${step}-previous] --> [${tr}]`
              })
            ]
          : [`[${step}] --> [${nav.previous.targets[0]}]`]

      return [...nextTargets, ...prevTargets].filter(isPresent)
    }
  )

  const nomnomlConfig = [
    `#title: ${diagramName}`,
    `#direction: ${direction}`,
    '#gravity: 2',
    '#edgeMargin: 10',
    '#padding: 16',
    '#spacing: 40',
    '#ranker: tight-tree',
    '#background: #e2edff',
    '#.state: visual=roundrect title=center,bold fill=#8f8',
    '#.event: visual=sender title=left,bold',
    '#.doneevent: visual=transceiver title=left',
    '#.errorevent: visual=receiver title=right'
  ] as const

  const nomnomlInput: string = [...nomnomlConfig, ...transitions].join('\n')

  return nomnomlInput
}
