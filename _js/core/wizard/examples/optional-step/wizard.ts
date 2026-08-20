import { z } from 'zod'
import { makeWizardConfig } from '../../index.js'

const BicycleType = z.enum(['road', 'trekking'])
type BicycleType = z.infer<typeof BicycleType>

const TrekkingAccessory = z.enum(['none', 'panniers', 'trailer'])
type TrekkingAccessory = z.infer<typeof TrekkingAccessory>

const WizardState = z.discriminatedUnion('step', [
  z.object({
    step: z.literal('select-bicycle-type'),
    bicycleType: BicycleType.nullable()
  }),
  z.object({
    step: z.literal('select-free-trekking-accessory'),
    bicycleType: z.literal(BicycleType.enum.trekking),
    freeAccessory: TrekkingAccessory.nullable()
  }),
  z.object({
    step: z.literal('summary'),
    bicycleType: BicycleType,
    freeAccessory: TrekkingAccessory
  })
])
type WizardState = z.infer<typeof WizardState>

export const Wizard = makeWizardConfig<WizardState>()
  .selectInitialStep('select-bicycle-type')
  .defineSteps(({ makeStep }) => {
    return {
      'select-bicycle-type': makeStep('select-bicycle-type')
        .defineNavigation({
          type: 'head',
          next: {
            targets: ['select-free-trekking-accessory', 'summary']
          },
          previous: null
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: (bicycleType) => BicycleType.parse(bicycleType)
        })
        .defineLogic({
          inferNextState: ({ input: bicycleType }) => {
            if (bicycleType === 'road') {
              return { step: 'summary', bicycleType, freeAccessory: 'none' }
            }

            bicycleType satisfies 'trekking'

            return {
              step: 'select-free-trekking-accessory',
              bicycleType,
              freeAccessory: null
            }
          },
          inferPrevState: ({ state }) => state
        }),
      'select-free-trekking-accessory': makeStep(
        'select-free-trekking-accessory'
      )
        .defineNavigation({
          type: 'node',
          next: {
            targets: ['summary']
          },
          previous: {
            targets: ['select-bicycle-type']
          }
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: (freeAccessory) => TrekkingAccessory.parse(freeAccessory)
        })
        .defineLogic({
          inferNextState: ({ state, input: freeAccessory }) => {
            return {
              step: 'summary',
              bicycleType: state.bicycleType,
              freeAccessory
            }
          },
          inferPrevState: ({ state }) => {
            return {
              step: 'select-bicycle-type',
              bicycleType: state.bicycleType
            }
          }
        }),
      summary: makeStep('summary')
        .defineNavigation({
          type: 'tail',
          next: null,
          previous: {
            targets: ['select-bicycle-type', 'select-free-trekking-accessory']
          }
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: () => null
        })
        .defineLogic({
          inferNextState: ({ state }) => state,
          inferPrevState: ({ state }) => {
            if (state.bicycleType === 'road') {
              return {
                step: 'select-bicycle-type',
                bicycleType: state.bicycleType
              }
            }

            state.bicycleType satisfies 'trekking'

            return {
              step: 'select-free-trekking-accessory',
              bicycleType: state.bicycleType,
              freeAccessory: state.freeAccessory
            }
          }
        })
    }
  })
  .compile()
