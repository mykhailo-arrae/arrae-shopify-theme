# Portable Web Components

## Overview

The system provides an ergonomic, framework-agnostic way to use custom elements
in a Shopify theme. It includes provisions for progressive enhancement in
server-side rendered context to prevent FOUC (Flash of Unstyled Content) and improve SEO.

The resouces for each component are colocated in a folder under
`_js/web-components/`. The Asset Loader runtime lazyloads the pre-compiled
assets only if the component is present on the page. Component assets are loaded
lazily and only once.

Portable components can be used in any Shopify context (sections,
snippets, templates) without additional configuration.

Components can be written in vanilla JS or with [Lit][lit].
Lit is recommended for DX and bundle size.

## Folder Structure

```
_js/web-components/
├── my-button/
│   ├── component.ts        # `MyButton` component class (LitElement/HTMLElement)
│   ├── index.ts            # Bundler entrypoint for registering custom-element
│   ├── style.shadow.scss   # Shadow-DOM styles
│   ├── ssr.scss            # SSR / FOUC fallback styles
│   └── tagmap.d.ts         # TypeScript declaration map
└── ...
```

The folder name, custom-element tag, and component class name must be the same.

## Getting Started

Run the interactive generator to scaffold a new component:

```bash
bb new-web-component
```

The generator will prompt you for a component name and create a folder will all required files.

### Create A Component Manually

1. Create a folder in `_js/web-components/<my-component>/`.
2. Add the five standard files shown in the folder structure above.
3. Make sure `index.ts` calls `customElements.define('<my-component>', MyComponent)`.

## File Structure

- `component.ts` — Main implementation. If you use Lit, extend `LitElement`; otherwise extend `HTMLElement` directly.

  Feel free to create as many additional files or subfolders as you need for the supporting modules.

- `index.ts` — Bundle entrypoint. Usually, it should only register the element with the browser.

- `style.shadow.scss` — Styles intended to be loaded in Shadow DOM. The build
system converts them into a string export from ESM Module

  ```ts
  import { shadowStyles } from './style.shadow.scss'
  ```

- `ssr.scss` — A minimal-scope fallback (no `:host` selectors!) applied
**globally** while the component JS is still loading or if JS is disabled. The
build system concatenates and compiles all `ssr.scss` files into
`assets/wc-ssr.css`.

- `tagmap.d.ts` - A type declaration to enable strict typings for
`document.createElement('my-component')` and JSX/TSX usage. Optional, generated
by the scaffold.

Optional files (icons, helpers, etc.) should be placed in the component folder to improve discovery and readability.

## Styling

### Shadow DOM Styles

Use `style.shadow.scss` for scoped Shadow DOM styles. The file is compiled to an
ESM module that provides the styles as a string to be used with Lit style system
or converted into a CSSStyleSheet in case of vanilla web components.

### SSR Styles

Use `ssr.scss` to apply styles to the component and its contents before it is
registered. SSR styles for all web components are collected into a single
'wc-ssr.css' asset which is loaded on every page (layout/theme.liquid)

SSR styles mangle the class names intentionally. You should use only the tag selectors in your SSR styles.

Keep SSR styles minimal and apply the **initial** visual state only (colors, sizes). Do not use `:host` selectors.

### Sass Imports

Sass `@use` imports resolve correctly in both Shadow DOM and SSR contexts.

## Best Practices

Use [Lit].

Treat portable components as a standalone business logic unit. Prefer
event/message passing over direct dependencies.

Do not register multiple custom elements in the same entrypoint. Use `<slot>`
notation if you want to compose components.

Use constructor() only for initializing internal state or properties. Keep side
effects in `connectedCallback()` and clean up in `disconnectedCallback()`.

To trigger asset loading for elements you insert dynamically, do
`document.dispatchEvent(new CustomEvent('portable:web-component:load'))`. The
asset loader inits component assets on section and snippet events automatically.

[lit]: https://lit.dev/docs
