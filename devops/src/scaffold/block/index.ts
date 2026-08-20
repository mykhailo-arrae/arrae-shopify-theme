import fs from 'node:fs/promises'
import Path from 'node:path'
import input from '@inquirer/input'
import { z } from 'devops-zod4'
import prettier from 'prettier'
import { DevOpsError } from '../../core/errors/index.js'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { workdir } from '../../core/process/workdir.js'
import { createBlockFolder } from './create-folder.js'

const logger = initLogger().with({ name: 'scaffold-block' })

const logErrorDetails = makeLogErrorDetails(logger)

const BlockName = z.string().min(2)

export const main = async (): Promise<void> => {
  const blockName = await input({
    message: 'Enter block name',
    validate: (value) => {
      const result = BlockName.safeParse(value)
      return result.success
        ? true
        : result.error.issues
            .map((issue) => issue.message)
            .join('\n')
            .trim()
    }
  })

  const prettierOptions = await prettier.resolveConfig(
    Path.resolve(workdir, 'placeholder.ts')
  )

  if (prettierOptions == null) {
    throw new DevOpsError('Prettier config not found')
  }

  logger.trace('Creating block folder')
  await createBlockFolder({ logger, blockName })

  const blockWorkdir = Path.resolve(workdir, '_js/blocks', blockName)

  logger.trace('Creating TS entrypoint')
  const _entrypointTemplate = `
  import { makeEventNamespace } from '../../core/dom/events/index.js';
  import { initPortableBlock } from '../../core/shopify/init-portable-block/index.js';

  initPortableBlock('${blockName}', (block, section) => {
    const namespace = makeEventNamespace();

    namespace.addDelegatedEventListener(block, '.js-button', 'click', (button) => {
      console.log('Button clicked:', button);
    });

    return () => {
      namespace.destroy();
    };
  });
  `
  const entrypointTemplate = await prettier.format(_entrypointTemplate, {
    ...prettierOptions,
    parser: 'typescript'
  })
  await fs.writeFile(
    Path.resolve(blockWorkdir, 'index.ts'),
    entrypointTemplate,
    { encoding: 'utf-8' }
  )

  logger.trace('Creating CSS module')
  const _cssModule = `.block { display: block; } .root { display: block; } .button { cursor: pointer; }`
  const cssModule = await prettier.format(_cssModule, {
    ...prettierOptions,
    parser: 'scss'
  })
  await fs.writeFile(Path.resolve(blockWorkdir, 'styles.scss'), cssModule)

  logger.trace('Creating block file')
  const template = `
<div class="{# style root #}">
  {{ block.settings.text }}

  <button class="js-button {# style button #}" type="button">Click me</button>
</div>

{% schema %}
{
  "name": "${blockName}",
  "class": "{# style block #}",
  "settings": [
    {
      "type": "richtext",
      "id": "text",
      "label": "Text"
    }
  ],
  "presets": [
    {
      "name": "${blockName}",
      "settings": {
        "text": "<p>Hello, world!</p>"
      }
    }
  ]
}
{% endschema %}
`
  await fs.writeFile(
    Path.resolve(blockWorkdir, 'block.liquid'),
    template.trimStart()
  )

  logger.info('Block structure created')
}

main().catch(logErrorDetails)
