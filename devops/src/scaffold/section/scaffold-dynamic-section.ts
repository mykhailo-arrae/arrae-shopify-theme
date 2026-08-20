import fs from 'node:fs/promises'
import Path from 'node:path'
import prettier from 'prettier'
import { DevOpsError } from '../../core/errors/index.js'
import type { Logger } from '../../core/logger/index.js'
import { workdir } from '../../core/process/workdir.js'
import { kebabCase } from '../../core/string/kebab-case.js'
import { createSectionFolder } from './create-folder.js'

export const scaffoldDynamicSection = async ({
  logger,
  sectionName
}: {
  logger: Logger
  sectionName: string
}): Promise<void> => {
  logger.debug('Scaffolding dynamic section: {sectionName}', { sectionName })

  const prettierOptions = await prettier.resolveConfig(
    Path.resolve(workdir, 'placeholder.ts')
  )

  if (prettierOptions == null) {
    throw new DevOpsError('Prettier config not found')
  }

  logger.trace('Creating section folder')
  await createSectionFolder({ logger, sectionName })

  const sectionWorkdir = Path.resolve(workdir, '_js/sections', sectionName)

  const jsHook = kebabCase(['js', sectionName].join('-'))

  logger.trace('Creating TS entrypoint')
  const _entrypointTemplate = `
  import { makeEventNamespace } from '../../core/dom/events/index.js';
  import { initSection } from '../../core/shopify/init-section/index.js';

  initSection('.${jsHook}', (section) => {
    const namespace = makeEventNamespace();

    namespace.addDelegatedEventListener(section, '.js-cta', 'click', (target) => {
      console.log('Button clicked:', target);
    })

    console.log('Section initialized:', section);

    return {
      unload: () => {
        console.log('Cleaning up section:', section);
        namespace.destroy();
      }
    }
  });
  `
  const entrypointTemplate = await prettier.format(_entrypointTemplate, {
    ...prettierOptions,
    parser: 'typescript'
  })
  await fs.writeFile(
    Path.resolve(sectionWorkdir, 'index.tsx'),
    entrypointTemplate,
    { encoding: 'utf-8' }
  )

  logger.trace('Creating CSS module')
  const _cssModule = `.section { background: blue; } .root { background: white; } .heading { color: red; } .cta { border-color: black; }`
  const cssModule = await prettier.format(_cssModule, {
    ...prettierOptions,
    parser: 'scss'
  })
  await fs.writeFile(Path.resolve(sectionWorkdir, 'styles.scss'), cssModule)

  logger.trace('Creating section file')
  const template = `
{% comment %}
  Section: Simple Heading Section
  Usage: A minimal section with just a heading
{% endcomment %}

<section class="{# style root #}">
  {% if section.settings.heading != blank %}
    <h2 class="{# style heading #}">
      {{ section.settings.heading }}
    </h2>
    <button class="js-cta {# style cta #}" type="button">
      Click me
    </button>
  {% endif %}
</section>

{% schema %}
{
  "name": "Simple Heading",
  "tag": "div",
  "class": "${jsHook} {# style section #}",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "Section Heading"
    }
  ],
  "presets": [
    {
      "name": "Simple Heading",
      "category": "Text"
    }
  ]
}
{% endschema %}
`
  await fs.writeFile(
    Path.resolve(sectionWorkdir, 'section.liquid'),
    template.trimStart()
  )

  logger.info('Section structure created')
}
