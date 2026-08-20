import type { MixedChangeItemsPayload } from '../../epics/change-items/payload.js'
import type { RemoveItemsPayload } from '../../epics/remove-items/payload.js'
import type { AddAttributesPayload } from '../../operations/add-attributes/payload.js'
import type { AddItemsPayload } from '../../operations/add-items/payload.js'
import type { AddNotePayload } from '../../operations/add-note/payload.js'
import type { ApplyDiscountsPayload } from '../../operations/apply-discounts/payload.js'

export type Init = {
  type: 'Init'
  payload: null
}

export type AddItems = {
  type: 'AddItems'
  payload: AddItemsPayload
}

export type ChangeItems = {
  type: 'ChangeItems'
  payload: MixedChangeItemsPayload
}

export type AddNote = {
  type: 'AddNote'
  payload: AddNotePayload
}

export type AddAttributes = {
  type: 'AddAttributes'
  payload: AddAttributesPayload
}

export type RemoveItems = {
  type: 'RemoveItems'
  payload: RemoveItemsPayload
}

export type ApplyDiscounts = {
  type: 'ApplyDiscounts'
  payload: ApplyDiscountsPayload
}

export type ClearDiscounts = {
  type: 'ClearDiscounts'
  payload: null
}

export type ClearCart = {
  type: 'ClearCart'
  payload: null
}

export type RefreshCart = {
  type: 'RefreshCart'
  payload: null
}

export type _MachineEvent =
  | Init
  | AddItems
  | ChangeItems
  | AddNote
  | AddAttributes
  | RemoveItems
  | ApplyDiscounts
  | ClearDiscounts
  | ClearCart
  | RefreshCart

export type MachineEvent = _MachineEvent & {
  cb?: {
    resolve: (value: undefined) => void
    reject: (reason: unknown) => void
  }
}
