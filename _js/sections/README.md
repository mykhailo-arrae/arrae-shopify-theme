# Portable Sections

Portable sections are enhanced versions of the standard Shopify sections, made possible by a custom AOT build process.

A portable section:

- Has its own dedicated directory containing all related source files
- Is easy to add or remove from a theme, as all files are contained in a single folder
- Includes styling and JS code
- Is automatically processed by the Theme Starter's build system

## File Structure

Required files:

```
_js/sections/[SECTION NAME]
├── section.liquid   # Template with Liquid markup and section schema
├── styles.scss      # Section-specific styles (converted to CSS modules)
└── index.{js|ts|tsx} # JavaScript/TypeScript entry point for section-specific functionality
```

## How It Works

1. **Automatic Processing**: The build system automatically detects and processes any folder in the `_js/sections/` directory.

1. **CSS Modules**: The `styles.scss` file is processed as a CSS module, generating unique class names to prevent style conflicts between sections.

   Use `{# style "className" #}` in your `section.liquid` file to reference classes from your styles file. These references will be automatically transformed to the corresponding hashed CSS module class names.

1. **Typescript Integration**: If an `index.js/ts/tsx` file exists in the portable section folder, the build system creates a dedicated bundle for that section, which is lazy-loaded only when the section appears on a page.

## Lifecycle Management

Use the [`initSection` helper][init_section] to manage the initialization and cleanup of your section JavaScript
in the Theme Editor context where sections can be dynamically added, removed, or reconfigured.

## Deployment

Whenever you create or modify a portable section, the build system automatically:

1. Processes the section's files
1. Generates a section file in `sections` folder
1. Adds JS bundle assets to the `assets` folder
1. Updates the asset manifest

[init_section]: /_js/core/shopify/init-section
