import type { ChangePropertiesPayload } from '../../operations/change-item-properties/payload.js'
import type { ChangeQuantityPayload } from '../../operations/change-item-quantity/payload.js'
import type { ChangeSellingPlanPayload } from '../../operations/change-item-selling-plan/payload.js'
import type { ChangeVariantPayload } from '../../operations/change-item-variant/payload.js'

export type MixedChangeItemsPayload = {
  operations: (
    | {
        type: 'changeItemQuantity'
        payload: ChangeQuantityPayload
      }
    | {
        type: 'changeItemProperties'
        payload: ChangePropertiesPayload
      }
    | {
        type: 'changeItemSellingPlan'
        payload: ChangeSellingPlanPayload
      }
    | {
        type: 'changeItemVariant'
        payload: ChangeVariantPayload
      }
  )[]
}
