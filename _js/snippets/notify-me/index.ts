import {
  findOneElement,
  findOneElementOfType
} from '../../core/dom/traversal/index.js'
import {
  isBackInStockSubscriptionAccepted,
  subscribeBackInStock
} from '../../core/klaviyo/back-in-stock.js'
import {
  getProductCtaState,
  parseNotifyMeConfigFromElement
} from '../../core/klaviyo/notify-me-policy.js'
import { initMainBus } from '../../core/messaging/main/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'

type IntlTelInputInstance = {
  getNumber: () => string
}

type IntlTelInputLoader = (
  input: HTMLInputElement,
  options: {
    initialCountry: string
    separateDialCode: boolean
  }
) => IntlTelInputInstance

type NotifyMeWindow = Window & {
  intlTelInput?: IntlTelInputLoader
}

declare let window: NotifyMeWindow

const findButton = findOneElementOfType(HTMLButtonElement)
const findInput = findOneElementOfType(HTMLInputElement)
const findSelect = findOneElementOfType(HTMLSelectElement)

const SHOW_POPUP_CLASS = 'show-notify-me-popup'
const POPUP_CUSTOM_CLASS = 'notify-popup-custom'
// WithUtils bundle includes the ESM utils module — loading build/js/utils.js
// via a classic <script> tag throws "Unexpected token 'export'".
const INTL_TEL_INPUT_SRC =
  'https://cdn.jsdelivr.net/npm/intl-tel-input@26.9.2/build/js/intlTelInputWithUtils.min.js'

const findScriptBySrc = (src: string): HTMLScriptElement | null =>
  Array.from(document.scripts).find((script) => script.src === src) ?? null

const loadExternalScript = (src: string): Promise<void> => {
  const existing = findScriptBySrc(src)

  if (existing != null) {
    // Script tag already present — resolve immediately if the browser marked it
    // complete, otherwise wait for its load/error.
    if (
      existing.dataset.loaded === 'true' ||
      existing.dataset.failed === 'true'
    ) {
      return existing.dataset.failed === 'true'
        ? Promise.reject(new Error(`Failed to load script: ${src}`))
        : Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      existing.addEventListener(
        'load',
        () => {
          existing.dataset.loaded = 'true'
          resolve()
        },
        { once: true }
      )
      existing.addEventListener(
        'error',
        () => {
          existing.dataset.failed = 'true'
          reject(new Error(`Failed to load script: ${src}`))
        },
        { once: true }
      )
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => {
      script.dataset.failed = 'true'
      reject(new Error(`Failed to load script: ${src}`))
    }
    document.head.append(script)
  })
}

const loadIntlTelInput = async (): Promise<IntlTelInputLoader> => {
  if (window.intlTelInput != null) {
    return window.intlTelInput
  }

  await loadExternalScript(INTL_TEL_INPUT_SRC)

  if (window.intlTelInput == null) {
    throw new Error('intlTelInput global was not defined after script load')
  }

  return window.intlTelInput
}

const getVariantOption = (
  select: HTMLSelectElement,
  variantId: number
): HTMLOptionElement | undefined => {
  return Array.from(select.options).find(
    (option) => option.value === String(variantId)
  )
}

const getKlaviyoErrorDetail = (value: unknown): string => {
  if (typeof value !== 'object' || value == null || !('errors' in value)) {
    return 'Unknown error'
  }

  const { errors } = value

  if (!Array.isArray(errors) || errors.length === 0) {
    return 'Unknown error'
  }

  const firstError: unknown = errors[0]

  if (
    typeof firstError !== 'object' ||
    firstError == null ||
    !('detail' in firstError)
  ) {
    return 'Unknown error'
  }

  const { detail } = firstError

  return typeof detail === 'string' ? detail : 'Unknown error'
}

initSnippet('notify-me', (snippet) => {
  const root = findOneElement(snippet, '.js-notify-me')

  if (root == null) {
    return
  }

  const companyId = root.getAttribute('data-company-id') ?? ''
  const successMessage =
    root.getAttribute('data-success-message') ?? 'You are on the list.'
  const invalidMessage =
    root.getAttribute('data-invalid-message') ??
    'Please enter a valid email and phone number.'
  const notifyMeConfig = parseNotifyMeConfigFromElement(root)

  const popup = findOneElement(root, '.notify-me-popup')
  const closeBtn = findOneElement(root, '.notify-me-popup__close')
  const submitBtn = findButton(root, '.notify-me-popup__button')
  const emailInput = findInput(root, '.notify-me-popup__input-email')
  const phoneInput = findInput(root, '.notify-me-popup__input-phone')
  const variantSelect = findSelect(root, '.notify-me-popup__variant-select')
  const variantDisplay = findOneElement(root, '.notify-me-popup__variant')
  const messageBlock = findOneElement(root, '.notify-me-popup__message')

  let runtimeVariantId = 0
  let runtimeVariantAvailable = true
  let submitOriginalText = ''
  let phoneInputInstance: IntlTelInputInstance | null = null
  let phoneInputInitCancelled = false

  const getVariantQuantity = (variantId: number): number => {
    if (variantSelect == null || variantId === 0) {
      return 0
    }

    const currentOption = getVariantOption(variantSelect, variantId)
    const quantity = Number.parseInt(
      currentOption?.getAttribute('data-variant-qty') ?? '0',
      10
    )

    return Number.isNaN(quantity) ? 0 : quantity
  }

  const updateVariantName = (): void => {
    if (
      variantDisplay == null ||
      variantSelect == null ||
      runtimeVariantId === 0
    ) {
      return
    }

    const currentOption = getVariantOption(variantSelect, runtimeVariantId)

    if (currentOption != null) {
      variantDisplay.textContent = currentOption.textContent?.trim() ?? ''
    }
  }

  const togglePopup = (show: boolean): void => {
    if (messageBlock != null) {
      messageBlock.textContent = ''
    }

    if (show) {
      updateVariantName()
      // Scope to this instance so PDP and quickshop popups stay independent.
      root.classList.add(SHOW_POPUP_CLASS, POPUP_CUSTOM_CLASS)
      emailInput?.focus()
      return
    }

    root.classList.remove(SHOW_POPUP_CLASS, POPUP_CUSTOM_CLASS)
  }

  const evaluateVisibility = (): boolean => {
    const isVisible =
      getProductCtaState({
        ...notifyMeConfig,
        variantId: runtimeVariantId,
        variantQuantity: getVariantQuantity(runtimeVariantId),
        variantAvailable: runtimeVariantAvailable
      }) === 'notify-me'

    if (!isVisible) {
      togglePopup(false)
    }

    return isVisible
  }

  const updateVariant = (
    variantId: number,
    variantAvailable: boolean
  ): void => {
    runtimeVariantId = variantId
    runtimeVariantAvailable = variantAvailable
    updateVariantName()
    evaluateVisibility()
  }

  const openPopup = (): void => {
    if (!evaluateVisibility()) {
      return
    }

    togglePopup(true)
  }

  const setLoading = (isLoading: boolean): void => {
    if (submitBtn == null) {
      return
    }

    if (isLoading) {
      submitBtn.disabled = true
      submitOriginalText = submitBtn.textContent ?? ''
      submitBtn.textContent = 'Processing...'
      return
    }

    submitBtn.disabled = false
    submitBtn.textContent = submitOriginalText
  }

  const initPhoneInput = async (): Promise<void> => {
    if (phoneInput == null) {
      return
    }

    try {
      const intlTelInput = await loadIntlTelInput()

      if (phoneInputInitCancelled) {
        return
      }

      phoneInputInstance = intlTelInput(phoneInput, {
        initialCountry: 'us',
        separateDialCode: true
      })
    } catch (err) {
      console.error('Failed to initialize phone input:', err)
    }
  }

  const handleSubmit = async (event: Event): Promise<void> => {
    event.preventDefault()
    event.stopImmediatePropagation()

    const email = emailInput?.value.trim() ?? ''
    const phone =
      phoneInputInstance?.getNumber() ?? phoneInput?.value.trim() ?? ''

    if (messageBlock != null) {
      messageBlock.textContent = ''
    }

    const isEmailValid = email.includes('@')
    const isPhoneValid = phone.length > 0

    if (!isEmailValid || !isPhoneValid) {
      if (messageBlock != null) {
        messageBlock.textContent = invalidMessage
      }
      return
    }

    if (runtimeVariantId === 0 || companyId.length === 0) {
      return
    }

    setLoading(true)

    try {
      const response = await subscribeBackInStock({
        email,
        phone,
        variantId: runtimeVariantId,
        publicApiKey: companyId
      })

      if (isBackInStockSubscriptionAccepted(response)) {
        if (messageBlock != null) {
          messageBlock.textContent = successMessage
        }
        if (emailInput != null) {
          emailInput.value = ''
        }
        if (phoneInput != null) {
          phoneInput.value = ''
        }
        return
      }

      const errorData: unknown = await response.json()
      const detail = getKlaviyoErrorDetail(errorData)
      window.alert(`Error: ${detail}`)
    } catch (err) {
      console.error('Network Error:', err)
      window.alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRootClick = (event: Event): void => {
    const target = event.target

    if (target === popup || target === closeBtn) {
      togglePopup(false)
    }
  }

  const handleSubmitClick = (event: Event): void => {
    void handleSubmit(event)
  }

  root.addEventListener('click', handleRootClick)
  submitBtn?.addEventListener('click', handleSubmitClick)

  void initPhoneInput()

  const mainBus = initMainBus()

  const notifyMeProductId = Number.parseInt(
    snippet.closest('form[data-product-id]')?.getAttribute('data-product-id') ??
      '',
    10
  )

  const selectedVariantRemover = mainBus
    .on('notification:selected-variant')
    .do(({ details: { product, selectedVariant } }) => {
      // Ignore variant events from other products (e.g. PDP vs quickshop).
      if (
        !Number.isNaN(notifyMeProductId) &&
        product.id !== notifyMeProductId
      ) {
        return
      }

      if (selectedVariant?.id == null) {
        runtimeVariantId = 0
        runtimeVariantAvailable = true
        togglePopup(false)
        return
      }

      updateVariant(selectedVariant.id, selectedVariant.available)
    })

  const openNotifyMeRemover = mainBus
    .on('request:open-notify-me')
    .do(({ details: { productId }, source }) => {
      // Prefer the originating buy box so same-product PDP + quickshop
      // instances do not both open. Fall back to product id for global sends.
      if (source.type === 'snippet') {
        if (!source.snippet.contains(root)) {
          return
        }
      } else if (
        !Number.isNaN(notifyMeProductId) &&
        productId !== notifyMeProductId
      ) {
        return
      }

      openPopup()
    })

  return () => {
    phoneInputInitCancelled = true
    root.removeEventListener('click', handleRootClick)
    submitBtn?.removeEventListener('click', handleSubmitClick)
    selectedVariantRemover()
    openNotifyMeRemover()
    root.classList.remove(SHOW_POPUP_CLASS, POPUP_CUSTOM_CLASS)
  }
})
