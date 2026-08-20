import test from 'ava'
import { saveNomnomlDiagramAsSvg } from '../../../nomnoml/save-as-svg.js'
import { generateWizardDiagram } from '../../generate-diagram.js'
import { Wizard } from './wizard.js'

test(`should generate diagram given wizard state`, async (t) => {
  const input = generateWizardDiagram({
    wizard: Wizard,
    diagramName: 'Independent Logic Branches Wizard Example',
    direction: 'right'
  })

  await saveNomnomlDiagramAsSvg({ input, path: __filename })

  t.pass('should save nomnoml diagram to disk')
})
