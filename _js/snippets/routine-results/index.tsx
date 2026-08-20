import { createRoot } from 'react-dom/client'
import { findOneElement } from '../../core/dom/traversal/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'
import { App } from './app.js'
import {
  type RoutineCreatorResults,
  RoutineCreatorResultsSchema,
  type RoutineSettings,
  RoutineSettingsSchema
} from './io.js'

const RENDER_TARGET_SELECTOR = '.js-routine-results-render-target'
const RESULTS_DATA_SELECTOR = '.js-routine-results-data'
const SETTINGS_SELECTOR = '.js-routine-settings'

const parseJSON = (raw: string | null | undefined): unknown => {
  if (raw == null || raw === '') {
    return null
  }
  return JSON.parse(raw)
}

const parseRoutineEntries = (
  parentSection: HTMLElement | null
): RoutineCreatorResults => {
  if (parentSection == null) {
    return []
  }

  const dataEl = findOneElement(parentSection, RESULTS_DATA_SELECTOR)
  if (dataEl == null) {
    return []
  }

  return RoutineCreatorResultsSchema.parse(parseJSON(dataEl.textContent))
}

const parseRoutineSettings = (
  parentSection: HTMLElement | null
): RoutineSettings => {
  const fallback = RoutineSettingsSchema.parse({ labels: {} })

  if (parentSection == null) {
    return fallback
  }

  const settingsEl = findOneElement(parentSection, SETTINGS_SELECTOR)
  if (settingsEl == null) {
    return fallback
  }

  return RoutineSettingsSchema.parse(parseJSON(settingsEl.textContent))
}

initSnippet('routine-results', (snippet, parentSection) => {
  const renderTarget = findOneElement(snippet, RENDER_TARGET_SELECTOR)

  if (renderTarget == null) {
    throw new Error('Routine results render target not found')
  }

  const entries = parseRoutineEntries(parentSection)
  const settings = parseRoutineSettings(parentSection)

  const root = createRoot(renderTarget)
  root.render(<App snippet={snippet} entries={entries} settings={settings} />)

  return () => {
    root.unmount()
  }
})
