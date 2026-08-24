# GitHub Actions — arrae-test

The old starter workflows (`Backup themes`, `Track themes`, `Deploy to Shopify`,
`Run Tests`) always failed because this repo has no tokens configured.

This project now has a single workflow: **[arrae-test](.github/workflows/arrae-test.yml)**.
It targets the `arrae-test` GitHub Environment and `arrae-test.myshopify.com`.

## Why the old Actions failed

Every scheduled run died at checkout:

```
Input required and not supplied: token
```

`actions/checkout` was given `token: ${{ secrets.CHECKOUT_ACTION_PAT }}`. That
secret is empty, so GitHub passes an empty token and checkout refuses to run.

Shopify credentials were also empty (`SHOPIFY_CLI_ADMIN_AUTH_TOKEN:` in the
logs). Even after fixing checkout, theme backup / track / deploy would fail
until a Shopify Admin API token exists on the GitHub Environment.

`arrae-test` does **not** require `CHECKOUT_ACTION_PAT`. Checkout uses the
default `GITHUB_TOKEN`.

## What you must add (and where)

Secrets cannot live in git. You add them in the GitHub UI.

### 1. GitHub Environment

Already created: **Settings → Environments → `arrae-test`**.

The environment name **must** match the Shopify store handle:
`arrae-test` → `arrae-test.myshopify.com`.

### 2. Environment secret (required for deploy)

On **Settings → Environments → arrae-test → Environment secrets**:

| Name                     | Value                                                                 |
| ------------------------ | --------------------------------------------------------------------- |
| `SHOPIFY_ADMIN_API_TOKEN` | Admin API access token from a custom app on `arrae-test.myshopify.com` |

How to create that token:

1. Open Shopify admin for `arrae-test.myshopify.com`
2. **Settings → Apps and sales channels → Develop apps**
3. Allow custom app development if prompted
4. **Create an app**, e.g. `GitHub CI`
5. **Configure Admin API scopes**:
   - `read_locales`
   - `read_markets`
   - `read_product_listings`
   - `read_products`
   - `read_themes` / `write_themes`
   - `read_translations` / `write_translations`
6. **Install app**
7. **API credentials → Admin API access token** — copy the `shpat_...` value
   (shown once)
8. Paste it as the `SHOPIFY_ADMIN_API_TOKEN` environment secret on GitHub

Without this secret, the **CI** job can still pass. The **Deploy** job fails
immediately with a message telling you the secret is missing.

### 3. Environment variables (optional)

On **Settings → Environments → arrae-test → Environment variables**:

| Name                              | Value                                      |
| --------------------------------- | ------------------------------------------ |
| `SHOPIFY_STOREFRONT_PASSWORD`     | Storefront lock password, or `none`        |
| `DEPLOYMENT_INITIAL_CONTENT_SOURCE` | `live-theme` (default) or `git`          |

Use `live-theme` if the store already has this theme published. Use `git` if
you are replacing a legacy theme and want JSON content from the repo.

## What the workflow does

| Job                    | When                                         | Tokens needed              |
| ---------------------- | -------------------------------------------- | -------------------------- |
| **CI**                 | Every push / PR to `main`, and manual runs   | None                       |
| **Deploy to arrae-test** | Push to `main`, or manual run (unless skip) | `SHOPIFY_ADMIN_API_TOKEN` |

Manual run: **Actions → arrae-test → Run workflow**. Check **Skip Shopify
deploy** to run CI only.

## What was removed

These workflows are gone so they stop failing on a schedule:

- `Backup themes` — pulled live/UAT themes from `arrae-staging` / `arrae-wellness`
- `Track themes` — same stores, live theme only
- `Deploy to Shopify` — multi-store deploy (`arrae-staging`, `arrae-wellness`)
- `Run Tests` — full CI, but blocked on the missing PAT at checkout

Bring backup/track back later only after those stores have
`SHOPIFY_ADMIN_API_TOKEN` on matching GitHub Environments **and** you actually
want scheduled pulls from production.

## Optional: `CHECKOUT_ACTION_PAT`

Not required for `arrae-test`. Add it later only if CI must push commits that
**re-trigger** workflows (the default `GITHUB_TOKEN` cannot do that).

If you need it:

1. GitHub → **Settings → Developer settings → Fine-grained tokens**
2. Repository access: this repo
3. Permissions: **Contents: Read and write**
4. Save as a **repository** secret named `CHECKOUT_ACTION_PAT`
   (Settings → Secrets and variables → Actions)

## Local deploy (same pipeline)

```bash
bb devops-deploy-to-shopify -t dev-testing -s prepare
bb devops-deploy-to-shopify -t dev-testing -s populate
```

Requires `.env` with `SHOPIFY_SHOP` and `SHOPIFY_CLI_ADMIN_AUTH_TOKEN`. See
[README.md](README.md).

<!-- Links -->

[github_environments]: https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment
[shopify_create_custom_app]: https://help.shopify.com/en/manual/apps/app-types/custom-apps
