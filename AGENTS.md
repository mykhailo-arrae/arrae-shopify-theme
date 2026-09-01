# AGENTS.md

## Cursor Cloud specific instructions

This repo is the **Vaan/"VaanGo" Shopify theme starter** (source in `_js/`, `_sass/`;
compiled Shopify theme output in `assets/`, `sections/`, `snippets/`, `blocks/`).
Human developers normally work inside the project's Docker container (`./up`, then
`bb run <task>`). In Cloud Agents we do **not** use Docker — the base image's
toolchain is installed natively on the VM so `bb run <task>` works directly from
`/workspace`. See `README.md` and `devops/ARCHITECTURE.md` for the product overview
and `bb.edn` for the full task list.

### Running tasks

- Use `bb run <task>` directly (e.g. `bb run build`, `bb run ci`). The `./run-task`
  wrapper also works because `IS_INSIDE_CONTAINER=1` is exported (it otherwise tries
  to shell into a Docker container that does not exist here).
- Env vars `WORKDIR=/workspace`, `THEMEDIR=/workspace`, `TMP_DIR=/mnt/tmp`,
  `NODE_ENV=development`, and Node 24 (via nvm) are set in `~/.bashrc` and are picked
  up by non-interactive shells. `TMP_DIR` is **required**: `pnpm-workspace.yaml`
  interpolates it for `storeDir`/`virtualStoreDir`, and several tasks (e.g.
  `stylelint`) and the build's temp folders depend on it.
- Node is pinned to **24.14.0** and pnpm to **10.32.1** to match the Docker base
  image. The VM's default `/exec-daemon/node` is older (v22); `~/.bashrc` prepends
  the nvm path so the correct Node wins.

### Non-obvious gotchas

- **pnpm must use the hoisted linker.** `swiper@11.2.2` imports `react` from
  `swiper/react` but declares no `react` peer dependency, and `react` (a direct dep)
  is not hoisted into pnpm's isolated `.pnpm` store, so rspack (which resolves
  symlinks to realpaths) cannot find `react` and `bb run build` fails with
  `Can't resolve 'react' in .../swiper`. Fix: install with `node-linker=hoisted`
  (set in `~/.npmrc` and also passed by the update script as
  `pnpm install --config.node-linker=hoisted`). If you ever reinstall manually, keep
  that flag or the build breaks.
- **First build of a brand-new portable section/snippet with a `./styles.scss.js`
  import can fail once** with `Can't resolve './styles.scss.js'`. The `styles.scss.ts`
  classname map is codegen'd by gulp *after* swc has already compiled `_js` →
  `_js-dist` in the same `build` run. Re-run `bb run build` (or run `bb run codegen`
  first); subsequent builds succeed. `bb run ci` handles ordering correctly.
- Rebuilding regenerates many files under `assets/` and some `sections/`/`snippets/`
  (chunk-splitting/minification can differ slightly from committed output, partly due
  to an aged `caniuse-lite`). These are build artifacts — don't commit them unless you
  intend to (the `bb run ci` pipeline commits them via its `commit-assets` step).

### What runs here vs. what needs Shopify credentials

- **Works fully offline (no secrets):** `bb run build`, `bb run typecheck`,
  `bb run test` (ava), `bb run lint` (oxlint + biome), `bb run themecheck`
  (Shopify CLI Theme Check is local static analysis). `bb run test` and `bb run lint`
  auto-run `prettify` at the end, which may reformat files.
- **Needs a Shopify store + Theme Access token** (`SHOPIFY_SHOP`,
  `SHOPIFY_CLI_ADMIN_AUTH_TOKEN`, see `.env.template`): `bb run deploy*`,
  `bb run dev`/`bb run watch`, `bb run fetch`. There is **no local storefront/dev
  server** — preview happens on a remote Shopify development theme. `hivemind`
  (needed by `watch`) is not installed since it is unusable without those credentials.
