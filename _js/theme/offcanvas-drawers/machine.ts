import type { StateMachine } from '@xstate/fsm'
import { assign, createMachine, interpret } from '@xstate/fsm'
import { type Infer, literal, union } from 'superstruct'

export const DrawerName = union([
  literal('none'),
  literal('cart'),
  literal('menu'),
  literal('search'),
  literal('filters'),
  literal('sort'),
  literal('quickshop')
])

export type DrawerName = Infer<typeof DrawerName>

export type Context = {
  drawerName: DrawerName
}

export type Event =
  | { type: 'expand'; drawerName: DrawerName }
  | { type: 'collapse' }

export type State =
  | { value: 'collapsed'; context: Context }
  | { value: 'expanded'; context: Context }

export const makeOffcanvasMachine = (): StateMachine.Machine<
  Context,
  Event,
  State
> =>
  createMachine<Context, Event, State>({
    initial: 'collapsed',
    context: {
      drawerName: 'none'
    },
    states: {
      collapsed: {
        on: {
          expand: {
            target: 'expanded',
            actions: [
              assign({
                drawerName: (_, evt) => evt.drawerName
              })
            ]
          }
        }
      },
      expanded: {
        on: {
          collapse: {
            target: 'collapsed'
          },
          // Switch drawer while another is open (e.g. add-to-cart from search drawer).
          expand: {
            target: 'expanded',
            actions: [
              assign({
                drawerName: (_, evt) => evt.drawerName
              })
            ]
          }
        }
      }
    }
  })

export const initOffcanvasMachine = (): StateMachine.Service<
  Context,
  Event,
  State
> => interpret(makeOffcanvasMachine())
