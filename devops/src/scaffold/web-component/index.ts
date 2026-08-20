import fs from 'node:fs/promises'
import Path from 'node:path'
import input from '@inquirer/input'
import prettier from 'prettier'
import { capitalize, toCamelCase } from 'remeda'
import { safeAwait } from '../../core/errors/safe-await.js'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { workdir } from '../../core/process/workdir.js'
import { parseWebComponentName } from '../../core/web-components/parse-wc-name.js'

const logger = initLogger().with({ name: 'scaffold-web-component' })

const logErrorDetails = makeLogErrorDetails(logger)

export const main = async (): Promise<void> => {
  const prettierOptions = await prettier.resolveConfig(workdir)

  const componentName = await input({
    message: 'Enter component name',
    validate: (value) => {
      try {
        return Boolean(parseWebComponentName(value))
      } catch (err: unknown) {
        return err instanceof Error
          ? err.message.trim()
          : 'Invalid component name'
      }
    }
  }).then(parseWebComponentName)

  const componentWorkdir = Path.resolve(
    workdir,
    '_js/web-components',
    componentName
  )

  const [componentWorkdirErr] = await safeAwait(fs.mkdir(componentWorkdir))

  if (componentWorkdirErr) {
    const stat = await fs.stat(componentWorkdir)

    if (stat.isDirectory() === false) {
      logger.error('Failed to create component folder')
      throw componentWorkdirErr
    }

    logger.debug('Component folder already exists: {componentWorkdir}', {
      componentWorkdir
    })
  }

  logger.debug('Creating component file')
  const componentClassName = capitalize(toCamelCase(componentName))
  const _componentFileContent = `
import { LitElement, html, unsafeCSS } from 'lit'
import { shadowStyles } from './style.shadow.scss'

export class ${componentClassName} extends LitElement {
  static override styles = [unsafeCSS(shadowStyles)]

  protected override render() {
    return html\`<div class="hello">Hello, world!</div>\`
  }
}
  `
  const componentFileContent = await prettier.format(_componentFileContent, {
    ...prettierOptions,
    parser: 'typescript'
  })
  await fs.writeFile(
    Path.resolve(componentWorkdir, 'component.ts'),
    componentFileContent
  )

  logger.debug('Creating entrypoint file')
  const _entrypointFileContent = `
import { ${componentClassName} } from './component.js'

customElements.define('${componentName}', ${componentClassName})
  `
  const entrypointFileContent = await prettier.format(_entrypointFileContent, {
    ...prettierOptions,
    parser: 'typescript'
  })
  await fs.writeFile(
    Path.resolve(componentWorkdir, 'index.ts'),
    entrypointFileContent
  )

  logger.debug('Creating type declaration file')
  const _typeDeclarationFileContent = `
import { ${componentClassName} } from './component.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface HTMLElementTagNameMap {
    ${JSON.stringify(componentName)}: ${componentClassName}
  }
}
  `
  const typeDeclarationFileContent = await prettier.format(
    _typeDeclarationFileContent,
    {
      ...prettierOptions,
      parser: 'typescript'
    }
  )
  await fs.writeFile(
    Path.resolve(componentWorkdir, 'tagmap.d.ts'),
    typeDeclarationFileContent
  )

  logger.debug('Creating shadow styles file')
  const _shadowStylesFileContent = `
:host {
  background: blue;
}

.hello {
  color: white;
}
  `
  const shadowStylesFileContent = await prettier.format(
    _shadowStylesFileContent,
    {
      ...prettierOptions,
      parser: 'scss'
    }
  )
  await fs.writeFile(
    Path.resolve(componentWorkdir, 'style.shadow.scss'),
    shadowStylesFileContent
  )

  logger.debug('Creating SSR styles file')
  const _ssrStylesFileContent = `
${componentName}:not(:defined) {
  background: red;
}
  `
  const ssrStylesFileContent = await prettier.format(_ssrStylesFileContent, {
    ...prettierOptions,
    parser: 'scss'
  })
  await fs.writeFile(
    Path.resolve(componentWorkdir, 'ssr.scss'),
    ssrStylesFileContent
  )

  logger.info('Web component structure created', {
    component: componentName,
    location: Path.relative(workdir, componentWorkdir)
  })
}

main().catch(logErrorDetails)
