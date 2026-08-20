import fs from 'fs/promises'
import * as nomnoml from 'nomnoml'
import Path from 'path'
import { optimize } from 'svgo'

export const saveNomnomlDiagramAsSvg = async ({
  input,
  path
}: {
  input: string
  path: string
}): Promise<void> => {
  const __output: string = nomnoml.renderSvg(input)
  const { data: _output } = optimize(__output, {
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: false,
            removeDesc: { removeAny: true }
          }
        }
      }
    ]
  })

  const buildFingerprintType = 'codegen'

  const output = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:${buildFingerprintType}] -->`,
    _output
  ].join('\n')

  const filepath = path
    .replace('_js-test', '_js')
    .replace(Path.extname(path), '.svg')

  await fs.writeFile(filepath, output, { encoding: 'utf-8' })
}
