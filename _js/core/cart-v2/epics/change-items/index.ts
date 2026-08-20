import { isPresent } from '../../../typescript/guards.js'
import type { CartContext } from '../../blueprints/context/index.js'
import type { OperationResult } from '../../blueprints/context/operation-result.js'
import {
  type MakeEpic,
  makeEpicWithCallback,
  type Operations
} from '../../blueprints/epic/index.js'
import { CartImplementationError } from '../../blueprints/errors/cart-implementation-error.js'
import type { MixedChangeItemsPayload } from './payload.js'

const makeEpic: MakeEpic<
  Pick<
    Operations,
    | 'changeItemQuantity'
    | 'changeItemProperties'
    | 'changeItemSellingPlan'
    | 'changeItemVariant'
    | 'postProcessCart'
    | 'getCurrentTimestamp'
    | 'broadcast'
  >,
  MixedChangeItemsPayload,
  CartContext
> = ({
  Operations: {
    changeItemQuantity,
    changeItemProperties,
    changeItemSellingPlan,
    changeItemVariant,
    postProcessCart,
    getCurrentTimestamp,
    broadcast
  }
}) => {
  return async ({ signal, payload, prevContext }) => {
    // Track what operations were performed and which items were affected
    const changedQuantities: { key: string; quantity: number }[] = []
    const changedProperties: { key: string }[] = []
    const changedSellingPlans: { key: string }[] = []
    const changedVariants: { key: string }[] = []

    // Process each operation in the requested order
    for (const operation of payload.operations) {
      if (operation.type === 'changeItemQuantity') {
        await changeItemQuantity({ payload: operation.payload, signal })
        // Track quantity changes
        operation.payload.items.forEach((item) => {
          changedQuantities.push({
            key: item.lineItemKey,
            quantity: item.quantity
          })
        })
        continue
      }

      if (operation.type === 'changeItemProperties') {
        await changeItemProperties({ payload: operation.payload, signal })
        // Track property changes
        operation.payload.items.forEach((item) => {
          changedProperties.push({ key: item.lineItemKey })
        })
        continue
      }

      if (operation.type === 'changeItemSellingPlan') {
        await changeItemSellingPlan({ payload: operation.payload, signal })
        // Track selling plan changes
        operation.payload.items.forEach((item) => {
          changedSellingPlans.push({ key: item.lineItemKey })
        })
        continue
      }

      if (operation.type === 'changeItemVariant') {
        await changeItemVariant({ payload: operation.payload, signal })
        operation.payload.items.forEach((item) => {
          changedVariants.push({ key: item.lineItemKey })
        })
        continue
      }

      // Exhaustiveness check
      operation satisfies never
      throw new CartImplementationError('Unknown operation type', {
        description: `Unsupported operation: ${JSON.stringify(operation)}`
      })
    }

    const { cart, warnings } = await postProcessCart({ signal })

    // Broadcast specific events for each operation type that was performed
    if (changedQuantities.length > 0) {
      broadcast({
        name: 'cart:items:quantity:changed',
        details: {
          items: changedQuantities
        },
        source: { type: 'global' }
      })
    }

    if (changedProperties.length > 0) {
      broadcast({
        name: 'cart:items:properties:changed',
        details: {
          items: changedProperties
        },
        source: { type: 'global' }
      })
    }

    if (changedSellingPlans.length > 0) {
      broadcast({
        name: 'cart:items:selling-plan:changed',
        details: {
          items: changedSellingPlans
        },
        source: { type: 'global' }
      })
    }

    const timestamp = getCurrentTimestamp()

    return {
      __type: 'Cart',
      cart,
      latestOperations: [
        ...prevContext.latestOperations,
        changedSellingPlans.length > 0
          ? {
              __type: 'changedItems' as const,
              timestamp,
              items: changedSellingPlans.map(({ key }) => ({
                key,
                title:
                  cart.items.find((item) => item.key === key)?.title || null
              }))
            }
          : null,
        changedProperties.length > 0
          ? {
              __type: 'changedItems' as const,
              timestamp,
              items: changedProperties.map(({ key }) => ({
                key,
                title:
                  cart.items.find((item) => item.key === key)?.title || null
              }))
            }
          : null,
        changedQuantities.length > 0
          ? {
              __type: 'changedItems' as const,
              timestamp,
              items: changedQuantities.map(({ key }) => ({
                key,
                title:
                  cart.items.find((item) => item.key === key)?.title || null
              }))
            }
          : null
      ].filter(isPresent) satisfies OperationResult[],
      warnings: [...prevContext.warnings, ...warnings]
    }
  }
}

export const makeChangeItemsEpic = makeEpicWithCallback({
  makeEpic,
  mapInput: ({ event }) => {
    if (event.type === 'ChangeItems') {
      return {
        payload: event.payload,
        cb: event.cb
      }
    }

    throw new CartImplementationError('Invalid event type', {
      description: `Expected ChangeItems, but got ${event.type}`
    })
  }
})
