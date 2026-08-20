/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

type InputData =
  | undefined
  | null
  | string
  | number
  | boolean
  | Record<string, unknown>
  | InputData[]

/**
 * Creates a strongly-typed wizard configuration for multi-step flows.
 *
 * This utility helps build type-safe wizards with well-defined navigation paths between steps.
 * It enforces proper step transitions, ensuring that only valid navigation between steps is allowed.
 * The wizard pattern is useful for complex forms, onboarding flows, or any multi-step process
 * where state needs to be maintained between transitions.
 *
 * @template WizardState - A discriminated union type representing all possible wizard states. Each state must have a unique 'step' property.
 * @returns A wizard configuration object with methods to define the initial step and navigation
 */
export const makeWizardConfig = <WizardState extends { step: string }>() => {
  type WizardSteps = WizardState['step']

  return {
    /**
     * A wizard can have only one starting point (head)
     *
     * So first we have to specify which state is going to the head of the wizard.
     */
    selectInitialStep: <HeadStep extends WizardSteps>(headStep: HeadStep) => {
      const makeStep = <CurrentStep extends WizardSteps>(step: CurrentStep) => {
        type CurrentState = Extract<WizardState, { step: CurrentStep }>

        /**
         * For brevity, we limit the number of target the developer can specify to 6
         * But this type can be extended to support more targets
         */
        type Targets =
          | [Exclude<WizardSteps, CurrentStep>]
          | [
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>
            ]
          | [
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>
            ]
          | [
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>
            ]
          | [
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>
            ]
          | [
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>,
              Exclude<WizardSteps, CurrentStep>
            ]

        type PrevNavTarget = { targets: Targets }
        type NextNavTarget = { targets: Targets }

        type HeadNavState = {
          type: 'head'
          next: NextNavTarget
          previous: null
        }

        type NodeNavState =
          | {
              type: 'tail'
              next: null
              previous: PrevNavTarget
            }
          | {
              type: 'node'
              next: NextNavTarget
              previous: PrevNavTarget
            }

        /**
         * This ensures the developer cannot set wrong type of `tail`/`node`
         * for the step they chose as head in `selectInitialStep`
         */
        type NavState = CurrentStep extends HeadStep
          ? HeadNavState
          : NodeNavState

        return {
          defineNavigation: <Nav extends NavState>(nav: Nav) => {
            type NextTargets = Nav['next'] extends NextNavTarget
              ? Nav['next']['targets'][number]
              : null

            type NextState = NextTargets extends WizardSteps
              ? Extract<WizardState, { step: NextTargets }>
              : CurrentState

            type PrevTargets = Nav['previous'] extends PrevNavTarget
              ? Nav['previous']['targets'][number]
              : null

            type PrevState = PrevTargets extends WizardSteps
              ? Extract<WizardState, { step: PrevTargets }>
              : CurrentState

            return {
              /**
               * Define how to parse input and context data for this wizard step.
               *
               * It ensures that data is properly validated and formatted for consistent processing in the next steps.
               */
              defineInputs: <
                ParsedContext extends InputData,
                ParsedInput extends InputData,
                RawContext,
                RawInput
              >({
                parseContext,
                parseInput
              }: {
                /**
                 * Transform and validate raw user input.
                 *
                 * @param raw - The raw input data to be parsed
                 * @returns The validated and transformed input data. The data should be JSON-compatible.
                 */
                parseInput: (
                  raw: RawInput
                ) => ParsedInput | Promise<ParsedInput>
                /**
                 * Transform and validate context data. Don't use it to store side-effect actions!
                 *
                 * @param raw - The raw input data to be parsed
                 * @returns The validated and transformed input data. The data should be JSON-compatible.
                 */
                parseContext: (
                  raw: RawContext
                ) => ParsedContext | Promise<ParsedContext>
              }) => {
                type Input = Awaited<ReturnType<typeof parseInput>>
                type Context = Awaited<ReturnType<typeof parseContext>>

                return {
                  defineLogic: ({
                    inferNextState,
                    inferPrevState
                  }: {
                    inferNextState: ({
                      state,
                      input,
                      context
                    }: {
                      state: CurrentState
                      input: Input
                      context: Context
                    }) => NextState
                    inferPrevState: ({
                      state
                    }: {
                      state: CurrentState
                    }) => PrevState
                  }) => {
                    return {
                      step,
                      nav,
                      inferNextState,
                      inferPrevState,
                      parseContext,
                      parseInput
                    }
                  }
                }
              }
            }
          }
        }
      }

      type InitialState = Extract<WizardState, { step: HeadStep }>
      type BaseWizard = { [Step in WizardSteps]: { step: Step } }

      return {
        defineSteps: <FinalWizard extends BaseWizard>(
          makeAllSteps: (helpers: { makeStep: typeof makeStep }) => FinalWizard
        ) => {
          return {
            compile: () => {
              const allSteps = makeAllSteps({ makeStep })

              const head = allSteps[headStep]

              const parseInitialState = (
                initialState: InitialState
              ): InitialState => {
                return initialState
              }

              return {
                allSteps,
                head,
                makeInitialState: parseInitialState
              }
            }
          }
        }
      }
    }
  }
}
