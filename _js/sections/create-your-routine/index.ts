import { makeEventNamespace } from '../../core/dom/events/index.js'
import { isHTMLInputElement } from '../../core/dom/guards.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'
import {
  freeze,
  thaw
} from '../../theme/offcanvas-drawers/freeze-body-scrolling.js'

type Labels = {
  next: string
  back: string
  submit: string
  stepTemplate: string
}

const RESULTS_TRANSITION_MS = 300
const RESULTS_DRAWER_NAME = 'routine-results'

const STEP_SELECTOR = 'fieldset[data-step]'
const ANSWER_SELECTOR = '.js-routine-answer'
const ANSWER_LABEL_SELECTOR = '.js-routine-answer-label'
const NEXT_SELECTOR = '.js-routine-next'
const BACK_SELECTOR = '.js-routine-back'
const NEXT_LABEL_SELECTOR = '.js-routine-next-label'
const STEP_TEXT_SELECTOR = '.js-routine-step-text'
const SETTINGS_SELECTOR = '.js-routine-settings'
const RESULTS_HOST_SELECTOR = '.js-routine-results-host'

const ROUTINE_SHOW_EVENT = 'routine:show'
const ROUTINE_CLOSE_EVENT = 'routine:close'

const readStringField = (
  source: object,
  key: string,
  fallback: string
): string => {
  if (!(key in source)) {
    return fallback
  }
  const value: unknown = Reflect.get(source, key)
  return typeof value === 'string' ? value : fallback
}

const parseLabels = (raw: unknown): Labels => {
  const fallback: Labels = {
    next: 'Next',
    back: 'Back',
    submit: 'Find your routine',
    stepTemplate: 'Step %current% / %total%'
  }

  if (raw == null || typeof raw !== 'object') {
    return fallback
  }

  return {
    next: readStringField(raw, 'next', fallback.next),
    back: readStringField(raw, 'back', fallback.back),
    submit: readStringField(raw, 'submit', fallback.submit),
    stepTemplate: readStringField(raw, 'stepTemplate', fallback.stepTemplate)
  }
}

const formatStepText = (
  template: string,
  current: number,
  total: number
): string => {
  return template
    .replace('%current%', String(current))
    .replace('%total%', String(total))
}

initSection('.js-create-your-routine', (section) => {
  const namespace = makeEventNamespace()
  const sectionRoot = findOneElement(section, '.js-create-your-routine-root')
  if (sectionRoot == null) {
    return { unload: null }
  }
  const totalAttr = sectionRoot.getAttribute('data-total-steps')
  const totalSteps = totalAttr != null ? Number.parseInt(totalAttr, 10) : 0

  if (!Number.isFinite(totalSteps) || totalSteps <= 0) {
    return { unload: null }
  }

  const settingsEl = findOneElement(section, SETTINGS_SELECTOR)
  let labels: Labels = {
    next: 'Next',
    back: 'Back',
    submit: 'Find your routine',
    stepTemplate: 'Step %current% / %total%'
  }

  if (settingsEl != null && settingsEl.textContent != null) {
    try {
      const parsed: unknown = JSON.parse(settingsEl.textContent)
      if (parsed != null && typeof parsed === 'object' && 'labels' in parsed) {
        labels = parseLabels(parsed.labels)
      }
    } catch (err) {
      console.warn('Routine settings JSON could not be parsed', err)
    }
  }

  const stepEls = findElements(section, STEP_SELECTOR).filter(
    (el) => el.dataset.step != null
  )
  const nextButton = findOneElement(section, NEXT_SELECTOR)
  const backButton = findOneElement(section, BACK_SELECTOR)
  const nextLabelEl = findOneElement(section, NEXT_LABEL_SELECTOR)
  const stepTextEl = findOneElement(section, STEP_TEXT_SELECTOR)
  const resultsHost = findOneElement(section, RESULTS_HOST_SELECTOR)

  if (nextButton == null || backButton == null || resultsHost == null) {
    return { unload: null }
  }

  const answersByStep = new Map<number, string>()
  let currentStep = 1

  const syncSelectedLabels = (step: number, value: string | null) => {
    const stepEl = stepEls.find(
      (el) => Number.parseInt(el.dataset.step ?? '', 10) === step
    )
    if (stepEl == null) {
      return
    }

    const answerLabels = findElements(stepEl, ANSWER_LABEL_SELECTOR)
    answerLabels.forEach((label) => {
      const labelValue = label.getAttribute('data-answer-value')
      const isSelected = value != null && labelValue === value
      label.setAttribute('data-selected', String(isSelected))
    })
  }

  // Every navigation (forward or backward) must land on a step with no pre-selected answer
  const resetStepSelection = (step: number) => {
    answersByStep.delete(step)
    syncSelectedLabels(step, null)
    const stepEl = stepEls.find(
      (el) => Number.parseInt(el.dataset.step ?? '', 10) === step
    )
    if (stepEl == null) {
      return
    }
    findElements(stepEl, ANSWER_SELECTOR).forEach((input) => {
      if (isHTMLInputElement(input)) {
        input.checked = false
      }
    })
  }

  // Step 1's initial (unanswered) state must announce the submit label
  // ("Find your routine") and stay disabled. Once an answer is picked, it
  // flips to the next label and becomes enabled. The last step always
  // announces the submit label regardless of selection state.
  const computeNextLabel = (step: number, hasAnswer: boolean): string => {
    const isLast = step === totalSteps
    const isInitialStep = step === 1 && !hasAnswer
    return isLast || isInitialStep ? labels.submit : labels.next
  }

  const updateNextButton = (step: number): void => {
    const hasAnswer = answersByStep.has(step)
    const label = computeNextLabel(step, hasAnswer)
    if (nextLabelEl != null) {
      nextLabelEl.textContent = label
    }
    nextButton.setAttribute('aria-label', label)
    nextButton.toggleAttribute('disabled', !hasAnswer)
    nextButton.setAttribute('aria-disabled', String(!hasAnswer))
  }

  const showStep = (nextStep: number, options: { focus?: boolean } = {}) => {
    const safeStep = Math.min(Math.max(nextStep, 1), totalSteps)
    currentStep = safeStep
    sectionRoot.setAttribute('data-current-step', String(safeStep))
    resetStepSelection(safeStep)

    stepEls.forEach((step) => {
      const idxAttr = step.dataset.step
      const idx = idxAttr != null ? Number.parseInt(idxAttr, 10) : Number.NaN
      const isActive = idx === safeStep
      step.hidden = !isActive
      step.setAttribute('aria-hidden', String(!isActive))
    })

    backButton.toggleAttribute('disabled', safeStep === 1)
    backButton.setAttribute('aria-disabled', String(safeStep === 1))

    updateNextButton(safeStep)

    if (stepTextEl != null) {
      stepTextEl.textContent = formatStepText(
        labels.stepTemplate,
        safeStep,
        totalSteps
      )
    }

    syncSelectedLabels(safeStep, answersByStep.get(safeStep) ?? null)

    if (options.focus === true) {
      const activeStep = stepEls.find(
        (step) => Number.parseInt(step.dataset.step ?? '', 10) === safeStep
      )
      if (activeStep != null) {
        const legend = activeStep.querySelector('legend')
        if (legend instanceof HTMLElement) {
          legend.setAttribute('tabindex', '-1')
          legend.focus({ preventScroll: false })
        }
      }
    }
  }

  const handleAnswerChange = (target: HTMLElement) => {
    if (!isHTMLInputElement(target)) {
      return
    }

    const stepAttr = target.dataset.step
    const step = stepAttr != null ? Number.parseInt(stepAttr, 10) : Number.NaN

    if (!Number.isFinite(step) || step !== currentStep) {
      return
    }

    answersByStep.set(step, target.value)
    syncSelectedLabels(step, target.value)
    updateNextButton(step)
  }

  // Tracks the pending "hide after close transition" timer so opening the
  // drawer again before the timer fires can cancel it cleanly.
  let closeTransitionTimer: number | null = null

  const cancelCloseTransition = () => {
    if (closeTransitionTimer != null) {
      window.clearTimeout(closeTransitionTimer)
      closeTransitionTimer = null
    }
  }

  const openResults = () => {
    const answers: string[] = []

    for (let step = 1; step <= totalSteps; step += 1) {
      const value = answersByStep.get(step)
      if (typeof value !== 'string') {
        return
      }
      answers.push(value)
    }

    cancelCloseTransition()

    resultsHost.hidden = false
    resultsHost.setAttribute('aria-hidden', 'false')
    freeze('has-open-offcanvas', RESULTS_DRAWER_NAME)
    // Keep "data-expanded" false for one frame so the panel paints in the
    // "closed" transform state. Setting it in the same turn as "hidden" is
    // removed skips CSS transitions (no intermediate computed style).
    void resultsHost.getBoundingClientRect()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resultsHost.setAttribute('data-expanded', 'true')

        resultsHost.dispatchEvent(
          new CustomEvent<{ answers: string[] }>(ROUTINE_SHOW_EVENT, {
            detail: { answers },
            bubbles: true
          })
        )

        const closeButton = findOneElement(
          resultsHost,
          '.js-routine-results-close'
        )
        if (closeButton != null) {
          closeButton.focus({ preventScroll: false })
        }
      })
    })
  }

  const closeResults = () => {
    resultsHost.setAttribute('data-expanded', 'false')
    resultsHost.setAttribute('aria-hidden', 'true')
    thaw('has-open-offcanvas')
    // Defer "hidden" until the close transform finishes so the drawer slides
    // out instead of disappearing instantly.
    cancelCloseTransition()
    closeTransitionTimer = window.setTimeout(() => {
      resultsHost.hidden = true
      closeTransitionTimer = null
    }, RESULTS_TRANSITION_MS)
    nextButton.focus({ preventScroll: false })
  }

  const handleNextClick = () => {
    if (!answersByStep.has(currentStep)) {
      return
    }

    if (currentStep === totalSteps) {
      openResults()
      return
    }

    showStep(currentStep + 1, { focus: true })
  }

  const handleBackClick = () => {
    if (currentStep <= 1) {
      return
    }

    showStep(currentStep - 1, { focus: true })
  }

  const answerInputs = findElements(section, ANSWER_SELECTOR)
  for (const input of answerInputs) {
    if (!isHTMLInputElement(input)) {
      continue
    }

    namespace.addDirectEventListener(input, 'change', (el) => {
      handleAnswerChange(el)
    })
  }

  namespace.addDirectEventListener(nextButton, 'click', () => {
    handleNextClick()
  })

  namespace.addDirectEventListener(backButton, 'click', () => {
    handleBackClick()
  })

  namespace.addDirectEventListener(resultsHost, ROUTINE_CLOSE_EVENT, () => {
    closeResults()
  })

  showStep(1)

  return {
    unload: () => {
      cancelCloseTransition()
      thaw('has-open-offcanvas')
      namespace.destroy()
    }
  }
})
