import { assign, fromPromise, setup } from 'xstate'
import type { Context } from '../blueprints/context/index.js'
import {
  mapEpicDoneToContext,
  mapEpicErrorToContext
} from '../blueprints/epic/map-result-to-context.js'
import type { MachineEvent } from '../blueprints/events/index.js'
import { State, type Tag } from '../blueprints/state/index.js'
import { makeAddAttributesEpic } from '../epics/add-attributes/index.js'
import { makeAddItemsEpic } from '../epics/add-items/index.js'
import { makeAddNoteEpic } from '../epics/add-note/index.js'
import { makeApplyDiscountsEpic } from '../epics/apply-discounts/index.js'
import { makeChangeItemsEpic } from '../epics/change-items/index.js'
import { makeClearCartEpic } from '../epics/clear-cart/index.js'
import { makeClearDiscountsEpic } from '../epics/clear-discounts/index.js'
import { makeInitializeEpic } from '../epics/initialize/index.js'
import { makeRefreshCartEpic } from '../epics/refresh-cart/index.js'
import { makeRemoveItemsEpic } from '../epics/remove-items/index.js'
import { Operations } from '../operations/index.js'

/**
 * XState passes the actor instance as well, but we don't need it.
 */
const cleanInput = ({
  event,
  context
}: {
  event: MachineEvent
  context: Context
}) => {
  return { event, context }
}

// We use these functions to initialize types in the xstate machine
// instead of using type assertion syntax suggested by the docs
const initContextTypes = (): Context => ({
  __type: 'NoCart',
  cart: null,
  latestOperations: [],
  warnings: []
})
const initEventTypes = (): MachineEvent => ({ type: 'Init', payload: null })
const initTagTypes = (): Tag => 'ready'
const initInput = (): { context: Context } => ({ context: initContextTypes() })

export const cartMachineConfig = setup({
  types: {
    context: initContextTypes(),
    events: initEventTypes(),
    input: initInput(),
    tags: initTagTypes()
  },
  actors: {
    initialize: fromPromise(makeInitializeEpic({ Operations })),
    addItems: fromPromise(makeAddItemsEpic({ Operations })),
    changeItems: fromPromise(makeChangeItemsEpic({ Operations })),
    removeItems: fromPromise(makeRemoveItemsEpic({ Operations })),
    addNote: fromPromise(makeAddNoteEpic({ Operations })),
    addAttributes: fromPromise(makeAddAttributesEpic({ Operations })),
    applyDiscounts: fromPromise(makeApplyDiscountsEpic({ Operations })),
    clearDiscounts: fromPromise(makeClearDiscountsEpic({ Operations })),
    clearCart: fromPromise(makeClearCartEpic({ Operations })),
    refreshCart: fromPromise(makeRefreshCartEpic({ Operations }))
  }
}).createMachine({
  initial: { target: State.enum.Idle },
  context: ({ input }) => {
    return input.context
  },
  states: {
    [State.enum.Idle]: {
      tags: ['busy'],
      on: {
        Init: {
          target: State.enum.Initializing
        }
      }
    },
    [State.enum.Initializing]: {
      tags: ['busy'],
      invoke: [
        {
          id: 'initialize',
          src: 'initialize',
          input: cleanInput,
          onDone: {
            target: State.enum.Ready,
            actions: assign(mapEpicDoneToContext)
          },
          onError: {
            target: State.enum.Ready,
            actions: assign(mapEpicErrorToContext)
          }
        }
      ]
    },
    [State.enum.Ready]: {
      tags: ['ready'],
      on: {
        AddItems: {
          target: State.enum.AddingItems
        },
        ChangeItems: {
          target: State.enum.ChangingItems
        },
        RemoveItems: {
          target: State.enum.RemovingItems
        },
        AddNote: {
          target: State.enum.AddingNote
        },
        AddAttributes: {
          target: State.enum.AddingAttributes
        },
        ApplyDiscounts: {
          target: State.enum.ApplyingDiscounts
        },
        ClearDiscounts: {
          target: State.enum.ClearingDiscounts
        },
        ClearCart: {
          target: State.enum.ClearingCart
        },
        RefreshCart: {
          target: State.enum.RefreshingCart
        }
      }
    },
    [State.enum.AddingItems]: {
      tags: ['busy'],
      invoke: [
        {
          id: 'addItems',
          src: 'addItems',
          input: cleanInput,
          onDone: {
            target: State.enum.Ready,
            actions: assign(mapEpicDoneToContext)
          },
          onError: {
            target: State.enum.Ready,
            actions: assign(mapEpicErrorToContext)
          }
        }
      ]
    },
    [State.enum.ChangingItems]: {
      tags: ['busy'],
      invoke: [
        {
          id: 'changeItems',
          src: 'changeItems',
          input: cleanInput,
          onDone: {
            target: State.enum.Ready,
            actions: assign(mapEpicDoneToContext)
          },
          onError: {
            target: State.enum.Ready,
            actions: assign(mapEpicErrorToContext)
          }
        }
      ]
    },
    [State.enum.RemovingItems]: {
      tags: ['busy'],
      invoke: [
        {
          id: 'removeItems',
          src: 'removeItems',
          input: cleanInput,
          onDone: {
            target: State.enum.Ready,
            actions: assign(mapEpicDoneToContext)
          },
          onError: {
            target: State.enum.Ready,
            actions: assign(mapEpicErrorToContext)
          }
        }
      ]
    },
    [State.enum.AddingNote]: {
      tags: ['busy'],
      invoke: [
        {
          id: 'addNote',
          src: 'addNote',
          input: cleanInput,
          onDone: {
            target: State.enum.Ready,
            actions: assign(mapEpicDoneToContext)
          },
          onError: {
            target: State.enum.Ready,
            actions: assign(mapEpicErrorToContext)
          }
        }
      ]
    },
    [State.enum.AddingAttributes]: {
      tags: ['busy'],
      invoke: [
        {
          id: 'addAttributes',
          src: 'addAttributes',
          input: cleanInput,
          onDone: {
            target: State.enum.Ready,
            actions: assign(mapEpicDoneToContext)
          },
          onError: {
            target: State.enum.Ready,
            actions: assign(mapEpicErrorToContext)
          }
        }
      ]
    },
    [State.enum.ApplyingDiscounts]: {
      tags: ['busy'],
      invoke: [
        {
          id: 'applyDiscounts',
          src: 'applyDiscounts',
          input: cleanInput,
          onDone: {
            target: State.enum.Ready,
            actions: assign(mapEpicDoneToContext)
          },
          onError: {
            target: State.enum.Ready,
            actions: assign(mapEpicErrorToContext)
          }
        }
      ]
    },
    [State.enum.ClearingDiscounts]: {
      tags: ['busy'],
      invoke: [
        {
          id: 'clearDiscounts',
          src: 'clearDiscounts',
          input: cleanInput,
          onDone: {
            target: State.enum.Ready,
            actions: assign(mapEpicDoneToContext)
          },
          onError: {
            target: State.enum.Ready,
            actions: assign(mapEpicErrorToContext)
          }
        }
      ]
    },
    [State.enum.ClearingCart]: {
      tags: ['busy'],
      invoke: [
        {
          id: 'clearCart',
          src: 'clearCart',
          input: cleanInput,
          onDone: {
            target: State.enum.Ready,
            actions: assign(mapEpicDoneToContext)
          },
          onError: {
            target: State.enum.Ready,
            actions: assign(mapEpicErrorToContext)
          }
        }
      ]
    },
    [State.enum.RefreshingCart]: {
      tags: ['busy'],
      invoke: [
        {
          id: 'refreshCart',
          src: 'refreshCart',
          input: cleanInput,
          onDone: {
            target: State.enum.Ready,
            actions: assign(mapEpicDoneToContext)
          },
          onError: {
            target: State.enum.Ready,
            actions: assign(mapEpicErrorToContext)
          }
        }
      ]
    }
  }
})
