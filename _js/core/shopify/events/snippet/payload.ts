export type LoadEventPayload = {
  type: 'portable:snippet:load'
  mode?: 'load-children' | 'self-only'
}

export type UnloadEventPayload = {
  type: 'portable:snippet:unload'
}

export type PortableSnippetEventPayload = LoadEventPayload | UnloadEventPayload

export const parseSnippetEventPayload = (
  evt: Event
): PortableSnippetEventPayload | null => {
  const { type: _type } = evt

  const eventType: PortableSnippetEventPayload['type'] | null =
    _type === 'portable:snippet:load'
      ? 'portable:snippet:load'
      : _type === 'portable:snippet:unload'
        ? 'portable:snippet:unload'
        : null

  if (eventType == null) {
    return null
  }

  if (eventType === 'portable:snippet:load') {
    const mode: 'load-children' | 'self-only' =
      'detail' in evt &&
      evt.detail != null &&
      typeof evt.detail === 'object' &&
      'mode' in evt.detail &&
      (evt.detail.mode === 'load-children' || evt.detail.mode === 'self-only')
        ? evt.detail.mode
        : 'load-children'

    return { mode, type: eventType }
  }

  if (eventType === 'portable:snippet:unload') {
    return {
      type: eventType
    }
  }

  eventType satisfies never
  return null
}
