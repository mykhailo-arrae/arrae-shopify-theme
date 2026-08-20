export type SectionData = {
  sectionName: string
}

export const parseSectionData = (input: unknown): SectionData => {
  if (input == null) {
    throw new Error('Input is not present')
  }

  if (typeof input !== 'object') {
    throw new TypeError('Input cannot be parsed')
  }

  const sectionName: string | null =
    'sectionName' in input &&
    typeof input.sectionName === 'string' &&
    input.sectionName.length > 0
      ? input.sectionName
      : null

  if (sectionName == null) {
    console.error('Section name is not defined', input)
    throw new Error('Section name is not defined')
  }

  return {
    sectionName
  }
}
