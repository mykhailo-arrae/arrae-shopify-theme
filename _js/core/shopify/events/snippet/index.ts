import type { PortableSnippetEventPayload } from './payload.js'

export type EmitSnippetEvent = (
  snippet: HTMLElement,
  payload: PortableSnippetEventPayload
) => void

export const emitSnippetEvent: EmitSnippetEvent = (snippet, payload) => {
  const { type } = payload

  if (snippet.matches('.portable-snippet') === false) {
    throw new Error('Snippet element does not have the correct class')
  }

  const snippetName = snippet.getAttribute('data-snippet-name')

  if (!snippetName) {
    throw new Error(
      "Snippet element doesn't have a data-snippet-name attribute"
    )
  }

  const detail =
    type === 'portable:snippet:load'
      ? { snippetName, mode: payload.mode || 'load-children' }
      : { snippetName }

  const evt = new CustomEvent(type, {
    detail,
    bubbles: true,
    cancelable: false
  })

  snippet.dispatchEvent(evt)
}
