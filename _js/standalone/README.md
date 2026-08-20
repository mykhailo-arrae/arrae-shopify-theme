Standalone JS Bundles
=====================

Create a standalone bundle definition using the command `bb scaffold:standalone-bundle`.

Using the bundle definition, the build system will generate a single Shopify
asset file or a Shopify snippet from the entrypoint TS/JS file.

Any imported modules, whether local or npm packages, will be bundled with
esbuild. This ensures that all dependencies are included, providing a seamless
integration of vendor code with Shopify.

Prefer portable sections or portable snippets for non-vendor code.

Expected file structure:

```
_js/standalone/[BUNDLE NAME]
├── index.(tsx|ts|js) (required)
├── schema.json (required)
└── [... other files or folders]
```

Output:

```
assets/[BUNDLE NAME].js (in asset mode)
snippets/[BUNDLE NAME].liquid (in snippet mode)
```
