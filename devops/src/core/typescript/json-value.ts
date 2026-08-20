/**
 * Represents all values serializable to JSON format
 */
export type JSONValue =
  | null
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | JSONValue[]
