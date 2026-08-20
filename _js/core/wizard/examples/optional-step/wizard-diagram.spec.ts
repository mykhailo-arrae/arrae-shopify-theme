import test from 'ava'
import { saveNomnomlDiagramAsSvg } from '../../../nomnoml/save-as-svg.js'
import { generateWizardDiagram } from '../../generate-diagram.js'
import { Wizard } from './wizard.js'

test(`should generate diagram given wizard state`, async (t) => {
  const input = generateWizardDiagram({
    wizard: Wizard,
    diagramName: 'Optional Step Wizard Example'
  })

  await saveNomnomlDiagramAsSvg({ input, path: __filename })

  t.pass('should save nomnoml diagram to disk')
})
