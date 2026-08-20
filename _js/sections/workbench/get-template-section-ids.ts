import { findElements } from '../../core/dom/traversal/index.js'
import { getText } from '../../core/network/get-text.js'

export const getTemplateSectionIds = async ({
  view,
  signal
}: {
  view: string | null
  signal: AbortSignal
}): Promise<string[]> => {
  const currentUrl = new URL(window.location.href)

  const url = new URL(
    `${currentUrl.origin}${currentUrl.pathname}${view ? `?view=${view}` : ''}`
  )

  const markup = await getText({
    url,
    options: {
      signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)])
    }
  }).catch((err: unknown) => {
    console.error(new Error('Template markup cannot be loaded', { cause: err }))
    return null
  })

  if (markup == null) {
    return []
  }

  const parser = new DOMParser()

  const doc = parser.parseFromString(markup, 'text/html')

  const sections = findElements(doc, '.shopify-section')

  return sections.flatMap((section): string[] => {
    const id = section.id

    if (id.startsWith('shopify-section-')) {
      return [id.replace('shopify-section-', '')]
    }

    return []
  })
}
