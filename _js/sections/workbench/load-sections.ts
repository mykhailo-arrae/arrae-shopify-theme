import z from 'zod'
import { getJson } from '../../core/network/get-json.js'
import { emitSectionEvent } from '../../core/shopify/events/section/index.js'

const SectionMarkupResponse = z.record(z.string(), z.string().nullable())

export const loadSections = async ({
  workbenchSection,
  selectedSections,
  selectedView,
  signal
}: {
  workbenchSection: HTMLElement
  selectedSections: string[]
  selectedView: string | null
  signal: AbortSignal
}): Promise<void> => {
  if (selectedSections.length === 0) {
    return
  }

  const currentUrl = new URL(window.location.href)

  const params = new URLSearchParams(
    [
      ['sections', selectedSections.join(',')],
      ['view', selectedView]
    ].flatMap(([key, value]): [string, string][] => {
      if (key == null || value == null) {
        return []
      }

      return [[key, value]]
    })
  ).toString()

  const url = new URL(`${currentUrl.origin}${currentUrl.pathname}?${params}`)

  const _data = await getJson({
    url,
    options: {
      signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)])
    }
  })
  const data = SectionMarkupResponse.parse(_data)

  const parser = new DOMParser()

  Object.values(data).forEach((markup) => {
    if (markup == null) {
      return
    }

    const doc = parser.parseFromString(markup, 'text/html')
    const section = doc.body.firstElementChild

    if (section instanceof HTMLElement === false) {
      return
    }

    const workbenchParent = workbenchSection.parentElement

    if (workbenchParent == null) {
      throw new Error('Workbench section parent not found')
    }

    workbenchParent.insertBefore(section, workbenchSection)

    emitSectionEvent(section, {
      type: 'shopify:section:load',
      detail: { sectionId: section.id }
    })
  })
}
