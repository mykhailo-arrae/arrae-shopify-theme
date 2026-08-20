import { findOneElement } from '../../core/dom/traversal/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'

initSnippet('markets-drawer', (snippet) => {
  const wrapEl = snippet.closest('.js-markets-wrap')
  if (!(wrapEl instanceof HTMLElement)) {
    return () => {}
  }
  const wrap: HTMLElement = wrapEl

  const popover = findOneElement(snippet, '.js-markets-popover')
  const form = findOneElement(snippet, 'form.js-markets-form')
  const trigger = findOneElement(wrap, '.js-markets-trigger')

  if (
    !(popover instanceof HTMLElement) ||
    !(form instanceof HTMLFormElement) ||
    !(trigger instanceof HTMLElement)
  ) {
    return () => {}
  }
  const popoverEl: HTMLElement = popover
  const formEl: HTMLFormElement = form
  const triggerEl: HTMLElement = trigger

  const setOpen = (next: boolean): void => {
    wrap.dataset.marketsOpen = next ? 'true' : 'false'
    triggerEl.setAttribute('aria-expanded', next ? 'true' : 'false')
    popoverEl.setAttribute('aria-hidden', next ? 'false' : 'true')
  }

  const isOpen = (): boolean => wrap.dataset.marketsOpen === 'true'

  setOpen(false)

  const handleTriggerClick = (evt: Event): void => {
    evt.preventDefault()
    setOpen(!isOpen())
  }

  const handleDocumentPointerDown = (evt: Event): void => {
    if (!isOpen()) {
      return
    }
    if (!(evt.target instanceof Node)) {
      return
    }
    if (wrap.contains(evt.target)) {
      return
    }
    setOpen(false)
  }

  const handleKeydown = (evt: Event): void => {
    if (!(evt instanceof KeyboardEvent)) {
      return
    }
    if (evt.key !== 'Escape' || !isOpen()) {
      return
    }
    setOpen(false)
    triggerEl.focus()
  }

  const handleChange = (evt: Event): void => {
    if (!(evt.target instanceof HTMLInputElement)) {
      return
    }
    if (evt.target.type !== 'radio') {
      return
    }
    if (typeof formEl.requestSubmit === 'function') {
      formEl.requestSubmit()
    } else {
      formEl.submit()
    }
  }

  triggerEl.addEventListener('click', handleTriggerClick)
  formEl.addEventListener('change', handleChange)
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleKeydown)

  return () => {
    triggerEl.removeEventListener('click', handleTriggerClick)
    formEl.removeEventListener('change', handleChange)
    document.removeEventListener('pointerdown', handleDocumentPointerDown)
    document.removeEventListener('keydown', handleKeydown)
  }
})
