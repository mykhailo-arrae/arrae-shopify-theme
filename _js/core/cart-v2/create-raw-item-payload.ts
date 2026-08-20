export type NameValuePair = {
  name: string
  value: string
}

export type RawItemPayload = {
  properties: Record<string, unknown>
  [key: string]: unknown
}

const propKeyRe = /^properties\[(.*)\]$/i

export const createRawItemPayload = (pairs: NameValuePair[]): RawItemPayload =>
  pairs.reduce(
    (acc: RawItemPayload, { name, value }): RawItemPayload => {
      if (name === 'properties') {
        return acc
      }

      if (name.startsWith('properties')) {
        if (propKeyRe.test(name) === false) {
          return acc
        }

        const propKey = name.trim().replace(propKeyRe, '$1').trim()

        if (!propKey) {
          return acc
        }

        acc.properties[propKey] = value
        return acc
      }

      acc[name] = value
      return acc
    },
    { properties: {} }
  )
