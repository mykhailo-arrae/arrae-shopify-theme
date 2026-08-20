export type SnippetMessageSource = {
  type: 'snippet'
  snippet: HTMLElement
  section: HTMLElement | null
}

export type SectionMessageSource = {
  type: 'section'
  section: HTMLElement
}

export type GlobalMessageSource = {
  type: 'global'
}

export type MessageSource =
  | SnippetMessageSource
  | SectionMessageSource
  | GlobalMessageSource

export type Message<N extends string, D> = {
  name: N
  details: D
  source: MessageSource
}
