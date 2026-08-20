import { customAlphabet } from 'nanoid'

const DICTIONARY = 'abcdefghijklmnopqrstuvwxyz0123456789'

const customNanoId = customAlphabet(DICTIONARY, 35)

/**
 * @description
 * Generates unique alphanumeric lowercase ID with the same length as UUID.
 *
 * Safe to use as HTML `id` or `name` value.
 */
export const genUid = (): string => 'z' + customNanoId()
