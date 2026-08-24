# Deployments

> [!NOTE]
> See [CI.md](CI.md)

# Development

> Avoid using the built-in terminal feature in your editor because it usually shuts down or
> restarts with the editor process. Do use a standalone terminal app, e.g.,
> Terminal (Mac), iTerm (Mac), Tilix (Linux), Kitty (Linux).

1. **Install a Docker runtime.** Only Linux and Mac platforms are supported.

   **Recommended:** [OrbStack][orbstack] (Mac) - provides better performance and experience than Docker Desktop.

   **Alternative:** [Docker Desktop][download docker] - fully compatible but with slower performance on Mac.

1. Create and retrieve your development access token (password) from [Theme Access app][theme_access_app].

   Install Theme Access app in the store if necessary.

1. Create `.env` from `.env.template` located at project root.

   Set `SHOPIFY_SHOP` value to the permanent domain of the store, e.g., `my-store.myshopify.com`

   Set `SHOPIFY_CLI_ADMIN_AUTH_TOKEN` value to the Theme Access password.

1. Open a terminal window and change the working directory to the project folder.

   Type `./up` to start the development container.

   The container shell prompt should appear after Docker builds an image and starts the container.

1. Initialize your personal development theme by typing in the container shell prompt:

   ```
   bb run deploy:dev
   ```

1. To start file watch mode, type in the container shell prompt:

   ```
   bb run watch
   ```

   Any file changes will be automatically uploaded to [your temporary development theme][development_themes].

1. To run CI tasks locally and ensure your code will pass the PR checks, type in the container shell prompt:

   ```
   bb run ci
   ```

1. Run `./edit` command to connect your preferred editor to the running container for full Typescript autocomplete support.

   The `./edit` command supports multiple editors:
   - **Cursor / VS Code**: Attaches directly to the container using the [Dev Containers extension][attach to container].
   - **Zed / JetBrains IDEs (WebStorm, PHPStorm)**: Connects via SSH. See the [Remote Development over SSH guide][remote_dev_ssh] for detailed setup instructions.

1. After you're done working with the project for the day, type `./down` to stop
   the container

Follow [Github Flow workflow][github flow] when committing your changes to the project repository.

You can type `pnpm run themecheck` in the container shell prompt to check for errors and enforce best practices in your theme code.

Anything in the `main` branch should be deployable.

# Development Environment

## Docker Container

The Docker container includes required versions of Node.js, Ruby,
Shopify CLI, ThemeKit, and other development dependencies.

You're not expected to install anything on your computer besides OrbStack.

## Node Modules

This project uses pnpm package manager to manage dependencies. **Do not use npm or Yarn**.

Please use [pnpm CLI commands][pnpm cli] _within the container_ to manage dependencies.

For performance, the `node_modules` folder is stored inside a Docker volume and the folder
contents are available within the container only.

## Typescript

**This project supports Typescript via [swc compiler][swc].**

The JS/TS source files in `_js` folder are compiled to `_js-dist` folder, then
webpack compiles the files from `_js-dist` folder and places bundles into
`assets`.

The project uses the `tsc` compiler only for type checking.

You can type `pnpm run typecheck` in the container shell prompt to run the type checking.

# Portable Sections

The project has opt-in CSS Module support[^css_modules] and on-demand JS asset initialization [^section_asset_loading] for sections.

To activate the feature for a section, create a _Section Folder_ file structure
in `_js/sections` as shown below:

```
_js/sections/[SECTION NAME]
├── index.ts (optional)
├── section.liquid
└── styles.scss
```

When section folder changes are detected, the build system would:

- inline the compiled stylesheet into the section using the inline `<style>` tag;
- generate a TS file with computed CSS classname mappings;
- generate a JS bundle file, e.g., `assets/tvg-section-slideshow.js` if the
  `index.ts` entrypoint is found;
- load the JS bundle file automatically if the section is present on the page.

To access the computed CSS classnames in the source section template,
use the custom `style` tag[^liquidjs_custom_syntax]:

```html
<!-- `my-section` Template -->
<h1 class="{# style Heading Heading--huge #}">Hello World</h1>

<!-- compiles to: -->
<h1 class="mod_my-section_TLXNAa_Heading mod_my-section_TLXNAa_Heading--huge">
  Hello World
</h1>
```

To access the computed CSS classnames in the companion JS code of the section,
import the `styles.scss.ts` file:

```ts
// The ES module imports should use `.js` extension, not `.ts` in Typescript
import style from './styles.scss.js`

const a = style.Heading
// --> mod_my-section_TLXNAa_Heading
```

Feel free to create subfolders in the Section Folder to colocate Typescript
modules related to the section code.

# Portable Snippets

The project has opt-in CSS Module support[^css_modules] and on-demand JS asset
initialization [^section_asset_loading] for snippets as well.

To create a new portable snippet, run the following command in your terminal:

```sh
bb run scaffold:snippet
```

The system will ask you for the name of the snippet and a few other parameters.
It will then scaffold a folder in `_js/snippets` with the required files.

The _Snippet Folder_ structure:

```
_js/snippets/[SNIPPET NAME]
├── index.ts (optional for static snippets)
├── schema.json
├── snippet.liquid
└── styles.scss
```

When file changes are detected in the snippet folder, the build system would:

- compile a CSS Module stylesheet[^css_modules] and:
  - inline the styles
  - or generate a companion snippet with the
    compiled stylesheet, e.g., `snippets/my-snippet-stylesheet.liquid` for `my-snippet` snippet;
- generate a TS file with computed CSS classname mappings;
- compile a JS bundle file and add the bundle dependencies to the asset loader
  manifest.

If you choose the external stylesheet mode, please ensure the companion style
snippet is also rendered on the page whenever the original snippet is used:

```liquid
{% render 'grid-item-stylesheet' %}
{% for item in items %}
  {% render 'grid-item' with item %}
{% endfor %}
```

Feel free to create subfolders in the Snippet Folder to colocate Typescript
modules related to the snippet code.

[^css_modules]:
    The project uses Lightning CSS to compile CSS Module stylesheets.

    Review available [CSS Modules syntax features][css_modules_syntax]
    but avoid Class Composition and Dependencies because we can achieve better
    results through Sass mixins and variables.

    You can disable CSS Modules for a portable section or snippet by adding
    `/* @cssModules global */` comment to the top of the `styles.scss` file.

[^liquidjs_custom_syntax]:
    The project uses [Liquid.js][liquidjs] to pre-compile the source section file into the final Shopify Liquid template.

    To avoid syntax conflicts, the source template uses `{:: ::}` instead of `{{ }}`
    for output and `{# #}` instead of `{% %}` for logical operations.

    The source template can use any standard Liquid.js tags and filters.

    Only `style` tag and `style` object are available for the source template.

[^section_asset_loading]:
    The build system produces individual bundles for each section that includes
    JS/TS companion code. A minimal section asset loader script checks which
    sections are present on the page and loads JS assets only for those sections.

# Portable Web Components

> [!NOTE]
> See [Portable Web Components](_js/web-components/README.md)

# jQuery

**Deprecation Notice** — avoid using jQuery when writing new code. Refactor
existing code to use native DOM methods whenever it makes sense.

See recommended core modules to replace jQuery functionality:

- [Delegated event listeners](./_js/core/dom/events)
- [DOM tree traversal](./_js/core/dom/traversal)

This project loads a special super-slim jQuery v3 build from a local npm package.

**Your code should not use jQuery from the global namespace**. Import jQuery as a module instead:

```js
import $ from 'jquery'
```

The following features are removed from the build:

- all AJAX functionality;
- all [deprecated methods][jquery deprecated];
- `.show()`, `.hide()`, `.animate()` methods;
- `.ready()`, `.on('ready')` methods;
- [jQuery.Deferred][jquery deferred];
- attachment of global jQuery variables (`$` and `jQuery`) to the `window`.

> Typescript will not complain if you use the removed methods, but your code will fail at runtime.

# Troubleshooting

## Do not mix JSON and Liquid template formats for the same page type

Online Store v2 allows having both [JSON template files][json templates] and
Liquid template files side by side in the same theme.

However, the Shopify storefront will behave in an unpredictable
way if the theme uses different template formats for the same page type.

You can have `product.json` and `collection.liquid` files in the same
project.

However, you should use the same format as the primary template when creating
alternative templates, e.g., use `product.json` with `product.alt.json` or
`product.liquid` with `product.alt.liquid`.

## Apple Silicon (M1/M1X) Macs

This project fully supports Macs with Intel and Apple Silicon processors.

## Node Modules

If you're experiencing issues with the `node_modules` or webpack cache, run the following command in your terminal:

```shell
docker compose down --volumes
```

## Docker Performance on Mac

**Recommended Solution:** Switch to [OrbStack][orbstack] for significantly better performance and resource efficiency compared to Docker Desktop.

> **Need to uninstall Docker Desktop?** See this comprehensive guide: [How To Uninstall Docker Desktop Mac](https://www.spyhunter.com/shm/uninstall-docker-desktop-mac/) for complete removal instructions.

If you must use Docker Desktop and experience slowdowns, optimize these settings in the app preferences:

1. Update Docker for Mac to the latest version.
1. Increase the number of CPUs to at least 4.
1. Increase memory to at least 2GB; 4GB or more is preferred, but no more than 30% of your total available memory.
1. In Resources --> File Sharing, keep only `/private` and `/tmp` directory entries; then add the folder where you keep your development code.

> To maximize performance, keep your code in a separate folder outside of Documents, e.g., `~/dev`.

# Versioning

The project follows `[YEAR]w[WEEK_NUMBER]` release naming convention, e.g., `2021w08` or `2021w52`, to mark weekly cumulative releases.

[attach to container]: https://code.visualstudio.com/docs/remote/attach-container
[development_themes]: https://shopify.dev/themes/tools/cli#development-themes
[download docker]: https://www.docker.com/community-edition#/download
[github flow]: http://scottchacon.com/2011/08/31/github-flow.html
[orbstack]: https://orbstack.dev/
[github_environments]: https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment
[jquery deferred]: https://api.jquery.com/category/deferred-object/
[jquery deprecated]: https://api.jquery.com/category/deprecated/
[json templates]: https://shopify.dev/themes/architecture/templates/json-templates
[pnpm cli]: https://pnpm.js.org/en/cli/install
[shopify_create_custom_app]: https://help.shopify.com/en/manual/apps/app-types/custom-apps#enable-custom-app-development-from-the-shopify-admin
[swc]: https://swc.rs/
[theme_access_app]: https://apps.shopify.com/theme-access
[css_modules_syntax]: https://lightningcss.dev/css-modules.html#global-exceptions
[section_assets]: https://shopify.dev/docs/themes/architecture/sections/section-assets
[liquidjs]: https://liquidjs.com/filters/overview.html
[remote_dev_ssh]: devops/docs/remote-development-over-ssh/README.md
