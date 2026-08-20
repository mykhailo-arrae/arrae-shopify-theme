const protocolRe = /http(s)?:/

const removeProtocol = (t = ''): string => t.replace(protocolRe, '')

/**
 * @description Port of Shopify `getSizedImageUrl` utility
 */
export const getSizedImageUrl = (
  url: string | null | undefined,
  size?: string
): string | null => {
  if (url == null) {
    return null
  }

  if (!url.includes('shopify.com')) {
    return url
  }

  if (size == null) {
    return url
  }

  if (size === 'master') {
    return removeProtocol(url)
  }

  const cleanUrl = removeProtocol(url)

  return cleanUrl.replace(
    /(.+)(_)((?:pico|icon|thumb|small|compact|medium|large|grande)|\d{1,4}x\d{0,4}|x\d{1,4})([_.@].+)/,
    (
      _,
      head: unknown,
      underscore: unknown,
      _oldSize: unknown,
      tail: unknown
    ): string => {
      if (
        typeof head !== 'string' ||
        typeof underscore !== 'string' ||
        typeof tail !== 'string'
      ) {
        return cleanUrl
      }
      return head + underscore + size + tail
    }
  )
}
