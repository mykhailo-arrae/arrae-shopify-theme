export const isHTMLElement = (
  t: Element | EventTarget | null
): t is HTMLElement => {
  return t instanceof HTMLElement
}

export const isHTMLIFrameElement = (
  t: Element | null
): t is HTMLIFrameElement => {
  return t instanceof HTMLIFrameElement
}

export const isHTMLInputElement = (
  t: Element | EventTarget | null
): t is HTMLInputElement => {
  return t instanceof HTMLInputElement
}

export const isHTMLButtonElement = (
  t: Element | EventTarget | null
): t is HTMLButtonElement => {
  return t instanceof HTMLButtonElement
}

export const isHTMLFormElement = (
  t: Element | EventTarget | null
): t is HTMLFormElement => {
  return t instanceof HTMLFormElement
}

export const isHTMLSelectElement = (
  t: Element | EventTarget | null
): t is HTMLSelectElement => {
  return t instanceof HTMLSelectElement
}

export const isHTMLMediaElement = (
  t: Element | EventTarget | null
): t is HTMLMediaElement => {
  return t instanceof HTMLMediaElement
}
