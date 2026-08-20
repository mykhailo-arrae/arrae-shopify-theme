import Path from 'node:path'
import { build, write } from 'bun'
import * as esbuild from 'esbuild'
import { DevOpsError } from './core/errors/index.js'
import { initLogger } from './core/logger/index.js'
import { gitdir } from './core/process/gitdir.js'

type Entrypoint = {
  inputPath: string
  outputPath: string
}

const logger = initLogger().with({ name: 'build-ci-scripts' })

const entrypoints: Entrypoint[] = [
  {
    inputPath: './devops/src/core/shopify/deployment/prepare-matrix.ts',
    outputPath: './devops/ci/prepare-deployment-matrix.js'
  }
]

const buildEntrypoint = async (entrypoint: Entrypoint) => {
  const { inputPath: _inputPath, outputPath: _outputPath } = entrypoint

  const inputPath = Path.resolve(gitdir, _inputPath)
  const outputPath = Path.resolve(gitdir, _outputPath)

  logger.debug('Building CI script', { entrypoint })

  const result = await build({
    entrypoints: [inputPath],
    format: 'esm',
    minify: false,
    root: gitdir,
    sourcemap: 'inline',
    packages: 'bundle',
    splitting: false,
    target: 'bun',
    define: {
      'process.env.NODE_ENV': JSON.stringify('production')
    }
  })

  result.logs.forEach((log) => {
    const level =
      log.level === 'error'
        ? 'error'
        : log.level === 'warning'
          ? 'warn'
          : 'trace'

    const { message, name: _name, ...details } = log

    logger[level]('{message}', { ...details, _name, message })
  })

  if (result.success === false) {
    logger.error('Failed to build CI script with Bun', { entrypoint })
    throw new DevOpsError('Failed to build CI script with Bun')
  }

  const firstBuildArtifact = result.outputs.at(0)

  if (firstBuildArtifact == null) {
    logger.error('No build artifact found', { entrypoint })
    throw new DevOpsError('No build artifact found')
  }

  const source = await firstBuildArtifact.text()

  const banner = [
    `/*! DO NOT EDIT: This file is auto-generated and will be overwritten. [build-`,
    `fingerprint:codegen:source={${_inputPath}}] */`,
    '\n\n',
    '// @bun',
    '\n'
  ].join('')

  const { code, warnings } = await esbuild.transform(source, {
    banner,
    minifyWhitespace: true,
    loader: 'js',
    format: 'esm',
    platform: 'neutral',
    lineLimit: 240
  })

  warnings.forEach(({ text: message, ...details }) => {
    logger.warn('{message}', { details, message })
  })

  await write(outputPath, code)

  logger.info('Built CI script: {outputPath}', { outputPath })
}

const run = async () => {
  for (const entrypoint of entrypoints) {
    await buildEntrypoint(entrypoint)
  }
}

run().catch((_err: unknown) => {
  // Bun prints its own errors better
  throw _err
})
