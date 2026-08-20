/**
 * Represents all values serializable to JSON format
 */
type JSONValue =
  | null
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | JSONValue[]

/**
 * We are extending the Body interface from the Fetch API
 * to ensure the json() method returns a useful type instead of `any`
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface Body {
  json(): Promise<JSONValue>
}
