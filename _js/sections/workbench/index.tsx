import { createRoot } from 'react-dom/client'
import { findOneElement } from '../../core/dom/traversal/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'
import { App } from './app.js'
import { loadSections } from './load-sections.js'
import { Manifest, Props } from './main.js'

initSection('.js-workbench', (workbenchSection) => {
  const workbenchUrl = new URL(window.location.href)

  const _selectedSections =
    workbenchUrl.searchParams.getAll('workbench-sections')
  const selectedSections = _selectedSections
    .flatMap((sectionName) => {
      return sectionName.split(',').map((name) => name.trim())
    })
    .filter((sectionName) => sectionName)

  const selectedView = workbenchUrl.searchParams.get('workbench-view') ?? null

  const manifestContainer = findOneElement(
    workbenchSection,
    '.json-workbench-manifest'
  )

  if (manifestContainer == null) {
    throw new Error('Workbench manifest not found')
  }

  const manifest = Manifest.parse(
    JSON.parse(manifestContainer.textContent ?? '{}')
  )

  const appContainer = findOneElement(workbenchSection, '.js-app-container')

  if (appContainer == null) {
    throw new Error('App container not found')
  }

  const defaultTemplateName = appContainer.getAttribute(
    'data-default-template-name'
  )

  const defaultTemplateView = appContainer.getAttribute(
    'data-default-template-view'
  )

  const controller = new AbortController()

  const props = Props.parse({
    defaultTemplateName,
    defaultTemplateView,
    selectedSections,
    selectedView,
    manifest
  } satisfies Props)

  const root = createRoot(appContainer, { identifierPrefix: 'workbench' })
  root.render(<App {...props} />)

  loadSections({
    workbenchSection,
    selectedSections,
    selectedView,
    signal: controller.signal
  }).catch((err: unknown) => {
    console.error(new Error('Workbench data cannot be loaded', { cause: err }))
  })

  return {
    unload: () => {
      controller.abort()
      root.unmount()
    }
  }
})
