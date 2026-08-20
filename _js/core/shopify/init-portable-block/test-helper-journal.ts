export type JournalEvent =
  | { type: 'stage'; name: string }
  | {
      type: 'load'
      blockId: string
      sectionId: string
    }
  | {
      type: 'unload'
      blockId: string
      sectionId: string
    }

export type AnnotatedJournal = Record<
  string,
  Exclude<JournalEvent, { type: 'stage' }>[]
>

export const annotateJournal = (input: JournalEvent[]): AnnotatedJournal => {
  const { journal } = input.reduce<{
    currentStage: string | null
    position: number
    journal: AnnotatedJournal
  }>(
    (acc, entry) => {
      if (entry.type === 'stage') {
        acc = {
          currentStage: entry.name,
          position: acc.position + 1,
          journal: acc.journal
        }

        const currentStage = [acc.position, acc.currentStage].join('-')
        acc.journal[currentStage] = []

        return acc
      }

      if (acc.currentStage == null) {
        throw new Error('Stage not set before action')
      }

      const currentStage = [acc.position, acc.currentStage].join('-')

      const prevGroup = acc.journal[currentStage] ?? []

      acc.journal[currentStage] = [...prevGroup, entry]

      return acc
    },
    { currentStage: null, position: 0, journal: {} }
  )

  return journal
}
