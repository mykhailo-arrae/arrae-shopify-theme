import { z } from 'zod'
import { makeWizardConfig } from '../../index.js'

const Name = z.string().min(1)
const LastName = z.string().min(1)

const WizardState = z.discriminatedUnion('step', [
  z.object({
    step: z.literal('start'),
    name: Name.nullable()
  }),
  z.object({
    step: z.literal('middle'),
    name: Name,
    lastname: LastName.nullable()
  }),
  z.object({
    step: z.literal('end'),
    name: Name,
    lastname: LastName
  })
])
type WizardState = z.infer<typeof WizardState>

export const Wizard = makeWizardConfig<WizardState>()
  .selectInitialStep('start')
  .defineSteps(({ makeStep }) => {
    return {
      start: makeStep('start')
        .defineNavigation({
          type: 'head',
          next: {
            targets: ['middle']
          },
          previous: null
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: (name) => {
            return Name.parse(name)
          }
        })
        .defineLogic({
          inferNextState: ({ input: name }) => {
            return { step: 'middle', name, lastname: null }
          },
          inferPrevState: ({ state }) => state
        }),
      middle: makeStep('middle')
        .defineNavigation({
          type: 'node',
          next: {
            targets: ['end']
          },
          previous: {
            targets: ['start']
          }
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: (lastName) => {
            return LastName.parse(lastName)
          }
        })
        .defineLogic({
          inferNextState: ({ state: { name }, input: lastname }) => {
            return { step: 'end', name, lastname }
          },
          inferPrevState: ({ state: { name } }) => {
            return { step: 'start', name }
          }
        }),
      end: makeStep('end')
        .defineNavigation({
          type: 'tail',
          next: null,
          previous: {
            targets: ['middle']
          }
        })
        .defineInputs({
          parseInput: () => null,
          parseContext: () => null
        })
        .defineLogic({
          inferNextState: ({ state }) => state,
          inferPrevState: ({ state: { name, lastname } }) => {
            return { step: 'middle', name, lastname }
          }
        })
    }
  })
  .compile()
