import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findOneElement } from '../../core/dom/traversal/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'

const NEWSLETTER_PHONE_MIN_DIGITS = 10
const NEWSLETTER_PHONE_MAX_DIGITS = 15
const NEWSLETTER_PHONE_MAX_CHARS = 20

const NEWSLETTER_PHONE_ALLOWED_CHARS = /[^0-9+\-\s()]/g
const KLAVIYO_API_URL = 'https://a.klaviyo.com/client/subscriptions?company_id='
const KLAVIYO_API_REVISION = '2026-04-15'

function sanitizeNewsletterPhoneInput(phoneEl: HTMLInputElement): void {
  const oldValue = phoneEl.value
  const selectionStart = phoneEl.selectionStart ?? oldValue.length

  const cleaned = oldValue
    .replace(NEWSLETTER_PHONE_ALLOWED_CHARS, '')
    .slice(0, NEWSLETTER_PHONE_MAX_CHARS)

  if (oldValue === cleaned) {
    return
  }

  const beforeCaret = oldValue.slice(0, selectionStart)
  const newCaret = Math.min(
    beforeCaret.replace(NEWSLETTER_PHONE_ALLOWED_CHARS, '').length,
    cleaned.length
  )

  phoneEl.value = cleaned
  phoneEl.setSelectionRange(newCaret, newCaret)
}

function applyNewsletterPhoneValidity(
  phoneEl: HTMLInputElement,
  invalidMessage: string
): void {
  phoneEl.setCustomValidity('')

  const value = phoneEl.value
  if (value.trim().length === 0) {
    return
  }

  const digitCount = (value.match(/\d/g) ?? []).length
  if (
    digitCount < NEWSLETTER_PHONE_MIN_DIGITS ||
    digitCount > NEWSLETTER_PHONE_MAX_DIGITS
  ) {
    phoneEl.setCustomValidity(invalidMessage)
    return
  }

  const patternAttr = phoneEl.getAttribute('pattern')
  if (patternAttr == null || patternAttr === '') {
    return
  }

  try {
    const expression = new RegExp(`^(?:${patternAttr})$`, 'u')
    if (!expression.test(value)) {
      phoneEl.setCustomValidity(invalidMessage)
    }
  } catch {
    phoneEl.setCustomValidity(invalidMessage)
  }
}

initSnippet('newsletter-form', (snippet) => {
  const namespace = makeEventNamespace()

  const phoneInput = findOneElement(snippet, '.js-form-phone')
  if (phoneInput instanceof HTMLInputElement) {
    namespace.addDirectEventListener(phoneInput, 'input', (el) => {
      sanitizeNewsletterPhoneInput(el)
      el.setCustomValidity('')
    })
  }

  namespace.addDelegatedEventListener(
    snippet,
    '.js-form',
    'submit',
    (form, event) => {
      event.preventDefault()

      if (!(form instanceof HTMLFormElement)) {
        return
      }

      const phoneEl = findOneElement(snippet, '.js-form-phone')
      if (!(phoneEl instanceof HTMLInputElement)) {
        return
      }

      const phoneInvalidMessage =
        form.dataset.phoneInvalidMessage ??
        'Enter a valid phone number with 10-15 digits.'

      applyNewsletterPhoneValidity(phoneEl, phoneInvalidMessage)

      if (!form.checkValidity()) {
        form.reportValidity()
        return
      }

      const container = findOneElement(snippet, '.js-newsletter')
      const errorTarget = findOneElement(snippet, '.js-error')
      const thanksEl = findOneElement(snippet, '.js-thanks')
      const firstnameEl = findOneElement(snippet, '.js-form-firstname')
      const emailEl = findOneElement(snippet, '.js-form-email')

      const listId = form.dataset.listId
      const apiKey = form.dataset.apiKey

      if (
        !firstnameEl ||
        !(firstnameEl instanceof HTMLInputElement) ||
        !emailEl ||
        !(emailEl instanceof HTMLInputElement)
      ) {
        return
      }

      // Clean error state
      if (errorTarget) {
        errorTarget.innerHTML = ''
        errorTarget.style.display = 'none'
      }

      if (firstnameEl instanceof HTMLInputElement) {
        firstnameEl.removeAttribute('aria-invalid')
      }

      if (emailEl instanceof HTMLInputElement) {
        emailEl.removeAttribute('aria-invalid')
      }

      if (phoneEl instanceof HTMLInputElement) {
        phoneEl.removeAttribute('aria-invalid')
      }

      // sanitize phone number by removing any spaces.  Final format must be +12345678901
      const sanitizedPhoneNumber = phoneEl.value.replace(/\s/g, '')

      const options = {
        method: 'POST',
        headers: {
          revision: KLAVIYO_API_REVISION,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            type: 'subscription',
            attributes: {
              custom_source: 'Arrae Web Storefront - HTML Footer Signup Form',
              profile: {
                data: {
                  type: 'profile',
                  attributes: {
                    first_name: firstnameEl.value,
                    email: emailEl.value,
                    phone_number: sanitizedPhoneNumber
                  }
                }
              }
            },
            relationships: { list: { data: { type: 'list', id: listId } } }
          }
        })
      }

      fetch(`${KLAVIYO_API_URL}${apiKey}`, options)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error, status: ${response.status}`)
          }
          if (container) {
            container.classList.add('successful')
          }
          if (errorTarget) {
            errorTarget.innerHTML = ''
            errorTarget.style.display = 'none'
          }
          if (thanksEl instanceof HTMLElement) {
            thanksEl.focus()
          }
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : 'Unknown error'
          if (errorTarget) {
            errorTarget.textContent = message
            errorTarget.style.display = 'block'
          }
          if (emailEl instanceof HTMLInputElement) {
            emailEl.setAttribute('aria-invalid', 'true')
            emailEl.focus()
          }
          if (err instanceof Error) {
            console.error('Error:', err.message)
            if (errorTarget) {
              errorTarget.textContent = err.message
              errorTarget.style.display = 'block'
            }
          } else {
            console.error('Unknown error:', err)
            if (errorTarget) {
              errorTarget.textContent = 'An unknown error occurred'
              errorTarget.style.display = 'block'
            }
          }
        })
    }
  )

  return () => {
    namespace.destroy()
  }
})
