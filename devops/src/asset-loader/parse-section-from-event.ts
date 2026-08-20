export const parseSectionFromEvent = (evt: Event): HTMLElement | null => {
  const section = evt.target instanceof HTMLElement ? evt.target : null

  if (section == null) {
    return null
  }

  const id = section.getAttribute('id')

  if (id == null) {
    return null
  }

  return section.classList.contains('shopify-section') &&
    id.startsWith('shopify-section-')
    ? section
    : null
}
