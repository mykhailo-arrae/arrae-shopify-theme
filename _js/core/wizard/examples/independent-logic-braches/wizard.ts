import { z } from 'zod'
import { makeWizardConfig } from '../../index.js'

const RoadBicycle = z.literal('road')
type RoadBicycle = z.infer<typeof RoadBicycle>

const TrekkingBicycle = z.literal('trekking')
type TrekkingBicycle = z.infer<typeof TrekkingBicycle>

const Unicycle = z.literal('unicycle')
type Unicycle = z.infer<typeof Unicycle>

const BicycleType = z.union([RoadBicycle, TrekkingBicycle, Unicycle])
type BicycleType = z.infer<typeof BicycleType>

const RoadDrivetrain = z.union([
  z.literal('Impeto Sola 1'),
  z.literal('Impeto Pelado 11'),
  z.literal('Dynamik R1400SL')
])
type RoadDrivetrain = z.infer<typeof RoadDrivetrain>

const TrekkingDrivetrain = z.union([
  z.literal('Impeto Bulvardo 3'),
  z.literal('Impeto Brizo 7'),
  z.literal('Impeto Brizo 8')
])
type TrekkingDrivetrain = z.infer<typeof TrekkingDrivetrain>

const UnicycleDrivetrain = z.literal('Fixed gear')
type UnicycleDrivetrain = z.infer<typeof UnicycleDrivetrain>

const RoadColor = z.union([
  z.literal('Oxford Blue'),
  z.literal('Pacific Blue Metallic'),
  z.literal('Valencia')
])
type RoadColor = z.infer<typeof RoadColor>

const TrekkingColor = z.union([
  z.literal('Black'),
  z.literal('Silver Metallic')
])
type TrekkingColor = z.infer<typeof TrekkingColor>

const UnicycleColor = z.literal('Firetruck Red')
type UnicycleColor = z.infer<typeof UnicycleColor>

const Saddle = z.union([
  z.literal('Orion Pro Uno'),
  z.literal('Race Italia Gel Flow'),
  z.literal('Foxford Heritage F17')
])
type Saddle = z.infer<typeof Saddle>

const UnicycleSaddle = z.literal('Firetruck Red')
type UnicycleSaddle = z.infer<typeof UnicycleSaddle>

const WizardState = z.discriminatedUnion('step', [
  z.object({
    step: z.literal('select-bicycle-type'),
    bicycleType: BicycleType.nullable()
  }),
  z.object({
    step: z.literal('road-select-drivetrain'),
    bicycleType: RoadBicycle,
    drivetrain: RoadDrivetrain.nullable()
  }),
  z.object({
    step: z.literal('road-select-color'),
    bicycleType: RoadBicycle,
    drivetrain: RoadDrivetrain,
    color: RoadColor.nullable()
  }),
  z.object({
    step: z.literal('road-select-saddle'),
    bicycleType: RoadBicycle,
    drivetrain: RoadDrivetrain,
    color: RoadColor,
    saddle: Saddle.nullable()
  }),
  z.object({
    step: z.literal('road-summary'),
    bicycleType: RoadBicycle,
    drivetrain: RoadDrivetrain,
    color: RoadColor,
    saddle: Saddle
  }),
  z.object({
    step: z.literal('trekking-select-drivetrain'),
    bicycleType: TrekkingBicycle,
    drivetrain: TrekkingDrivetrain.nullable()
  }),
  z.object({
    step: z.literal('trekking-select-color'),
    bicycleType: TrekkingBicycle,
    drivetrain: TrekkingDrivetrain,
    color: TrekkingColor.nullable()
  }),
  z.object({
    step: z.literal('trekking-select-saddle'),
    bicycleType: TrekkingBicycle,
    drivetrain: TrekkingDrivetrain,
    color: TrekkingColor,
    saddle: Saddle.nullable()
  }),
  z.object({
    step: z.literal('trekking-summary'),
    bicycleType: TrekkingBicycle,
    drivetrain: TrekkingDrivetrain,
    color: TrekkingColor,
    saddle: Saddle
  }),
  z.object({
    step: z.literal('unicycle-summary'),
    bicycleType: Unicycle,
    drivetrain: UnicycleDrivetrain,
    color: UnicycleColor,
    saddle: UnicycleSaddle
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
            targets: [
              'road-select-drivetrain',
              'trekking-select-drivetrain',
              'unicycle-summary'
            ]
          },
          previous: null
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: (bicycleType) => {
            return BicycleType.parse(bicycleType)
          }
        })
        .defineLogic({
          inferNextState: ({ input: bicycleType }) => {
            if (bicycleType === 'road') {
              return {
                step: 'road-select-drivetrain',
                bicycleType,
                drivetrain: null
              }
            }

            if (bicycleType === 'trekking') {
              return {
                step: 'trekking-select-drivetrain',
                bicycleType,
                drivetrain: null
              }
            }

            bicycleType satisfies 'unicycle'

            return {
              step: 'unicycle-summary',
              bicycleType,
              color: 'Firetruck Red',
              drivetrain: 'Fixed gear',
              saddle: 'Firetruck Red'
            }
          },
          inferPrevState: ({ state }) => state
        }),
      'road-select-drivetrain': makeStep('road-select-drivetrain')
        .defineNavigation({
          type: 'node',
          next: {
            targets: ['road-select-color']
          },
          previous: {
            targets: ['select-bicycle-type']
          }
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: (drivetrain) => RoadDrivetrain.parse(drivetrain)
        })
        .defineLogic({
          inferNextState: ({ state: { bicycleType }, input: drivetrain }) => {
            return {
              step: 'road-select-color',
              bicycleType,
              drivetrain,
              color: null
            }
          },
          inferPrevState: ({ state: { bicycleType } }) => {
            return { step: 'select-bicycle-type', bicycleType }
          }
        }),
      'road-select-color': makeStep('road-select-color')
        .defineNavigation({
          type: 'node',
          next: {
            targets: ['road-select-saddle']
          },
          previous: {
            targets: ['road-select-drivetrain']
          }
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: (color) => RoadColor.parse(color)
        })
        .defineLogic({
          inferNextState: ({
            state: { bicycleType, drivetrain },
            input: color
          }) => {
            return {
              step: 'road-select-saddle',
              bicycleType,
              drivetrain,
              color,
              saddle: null
            }
          },
          inferPrevState: ({ state: { bicycleType, drivetrain } }) => {
            return { step: 'road-select-drivetrain', bicycleType, drivetrain }
          }
        }),
      'road-select-saddle': makeStep('road-select-saddle')
        .defineNavigation({
          type: 'node',
          next: {
            targets: ['road-summary']
          },
          previous: {
            targets: ['road-select-color']
          }
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: (saddle) => Saddle.parse(saddle)
        })
        .defineLogic({
          inferNextState: ({
            state: { bicycleType, drivetrain, color },
            input: saddle
          }) => {
            return {
              step: 'road-summary',
              bicycleType,
              drivetrain,
              color,
              saddle
            }
          },
          inferPrevState: ({ state: { bicycleType, drivetrain, color } }) => {
            return { step: 'road-select-color', bicycleType, drivetrain, color }
          }
        }),
      'road-summary': makeStep('road-summary')
        .defineNavigation({
          type: 'tail',
          next: null,
          previous: {
            targets: ['road-select-saddle']
          }
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: () => null
        })
        .defineLogic({
          inferNextState: ({ state }) => state,
          inferPrevState: ({ state }) => {
            return { ...state, step: 'road-select-saddle' }
          }
        }),
      // Trekking
      'trekking-select-drivetrain': makeStep('trekking-select-drivetrain')
        .defineNavigation({
          type: 'node',
          next: {
            targets: ['trekking-select-color']
          },
          previous: {
            targets: ['select-bicycle-type']
          }
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: (drivetrain) => TrekkingDrivetrain.parse(drivetrain)
        })
        .defineLogic({
          inferNextState: ({ state: { bicycleType }, input: drivetrain }) => {
            return {
              step: 'trekking-select-color',
              bicycleType,
              drivetrain,
              color: null
            }
          },
          inferPrevState: ({ state: { bicycleType } }) => {
            return { step: 'select-bicycle-type', bicycleType }
          }
        }),
      'trekking-select-color': makeStep('trekking-select-color')
        .defineNavigation({
          type: 'node',
          next: {
            targets: ['trekking-select-saddle']
          },
          previous: {
            targets: ['trekking-select-drivetrain']
          }
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: (color) => TrekkingColor.parse(color)
        })
        .defineLogic({
          inferNextState: ({
            state: { bicycleType, drivetrain },
            input: color
          }) => {
            return {
              step: 'trekking-select-saddle',
              bicycleType,
              drivetrain,
              color,
              saddle: null
            }
          },
          inferPrevState: ({ state: { bicycleType, drivetrain } }) => {
            return {
              step: 'trekking-select-drivetrain',
              bicycleType,
              drivetrain
            }
          }
        }),
      'trekking-select-saddle': makeStep('trekking-select-saddle')
        .defineNavigation({
          type: 'node',
          next: {
            targets: ['trekking-summary']
          },
          previous: {
            targets: ['trekking-select-color']
          }
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: (saddle) => Saddle.parse(saddle)
        })
        .defineLogic({
          inferNextState: ({
            state: { bicycleType, drivetrain, color },
            input: saddle
          }) => {
            return {
              step: 'trekking-summary',
              bicycleType,
              drivetrain,
              color,
              saddle
            }
          },
          inferPrevState: ({ state: { bicycleType, drivetrain, color } }) => {
            return {
              step: 'trekking-select-color',
              bicycleType,
              drivetrain,
              color
            }
          }
        }),
      'trekking-summary': makeStep('trekking-summary')
        .defineNavigation({
          type: 'tail',
          next: null,
          previous: {
            targets: ['trekking-select-saddle']
          }
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: () => null
        })
        .defineLogic({
          inferNextState: ({ state }) => state,
          inferPrevState: ({ state }) => {
            return { ...state, step: 'trekking-select-saddle' }
          }
        }),
      'unicycle-summary': makeStep('unicycle-summary')
        .defineNavigation({
          type: 'tail',
          next: null,
          previous: {
            targets: ['select-bicycle-type']
          }
        })
        .defineInputs({
          parseContext: () => null,
          parseInput: () => null
        })
        .defineLogic({
          inferNextState: ({ state }) => state,
          inferPrevState: ({ state: { bicycleType } }) => {
            return { step: 'select-bicycle-type', bicycleType }
          }
        })
    }
  })
  .compile()
