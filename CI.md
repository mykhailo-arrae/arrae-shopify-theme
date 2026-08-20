# Deployment

The project uses a unified GitHub Action workflow for automated deployments to Shopify across multiple environments.

## Deployment Targets

| Target        | Theme Name         | Trigger                       |
| ------------- | ------------------ | ----------------------------- |
| `dev-testing` | `Vaan Dev Testing` | Auto-deploy on push to `main` |
| `dev-qa`      | `Vaan Dev QA`      | Manual via workflow dispatch  |
| `uat`         | `Vaan UAT`         | Manual via workflow dispatch  |

## Development Workflow

Developers should create feature branches from the `main` branch and create
pull-requests back to `main` when they are ready to merge the feature.

Developers should never push commits directly to the `main` branch.

## How To Deploy to Environments

### Automatic Deployments (dev-testing)

The `dev-testing` environment is automatically updated on every push to the `main` branch,
providing immediate preview of merged changes.

### Manual Deployments (dev-qa, uat)

To deploy to `dev-qa` or `uat` environments:

1. Navigate to the Actions tab of the repository
2. Select "Deploy to Shopify" workflow in the sidebar
3. Click "Run workflow" button
4. Select the deployment target:
   - `dev-qa` - For QA testing
   - `uat` - For client review/UAT
5. (Optional) Add content override patterns if needed
6. Click "Run workflow" to start deployment

### Content Preservation

During deployments, the system intelligently manages theme content (JSON settings, templates, etc.):

1. **Content Sources**: Content can be sourced from:

   - `live-theme` (default) - Uses content from the published/live theme
   - `git` - Uses content from the git repository
   - Existing target theme (if available)

2. **Git Tracking**: Content changes are automatically committed to deployment branches:

   - Pattern: `deployments/[target]/[store-handle]`
   - Example: `deployments/dev-qa/vaangoods-dev`

3. **Content Override Patterns**: Selectively override specific content files during deployment
   using glob patterns (see [Content Override Patterns](#content-override-patterns) below)

Set the initial content source preference via [GitHub Environments](#github-environments):

- Choose `live-theme` if the store is already using your theme
- Choose `git` if migrating from a legacy theme

## Content Override Patterns

Content override patterns allow selective file updates during deployment, useful for:

- Adding new templates or section groups to the target theme
- Forcing locale updates

### Usage

**Via Workflow Dispatch:**

```
config/settings_data.json ||| templates/product.*.json ||| sections/header.json
```

**Via Environment Configuration:**

Edit the `contentOverridePatterns` property in `devops/src/config/deployment-matrix.json` for permanent overrides per environment.

### Pattern Syntax

- Uses git glob patterns (e.g., `templates/*.json`, `config/settings_*`)
- Multiple patterns separated by `|||`
- Patterns are validated before deployment
- Invalid patterns will fail the deployment

### Examples

| Pattern                                            | Effect                         |
| -------------------------------------------------- | ------------------------------ |
| `config/settings_data.json`                        | Override theme settings        |
| `templates/*.json`                                 | Override all template files    |
| `sections/header.json \|\|\| sections/footer.json` | Override specific sections     |
| `locales/*.json`                                   | Override all translation files |

## Deployment Branches

The deployment system maintains separate git branches for tracking deployments:

- **Naming Pattern**: `deployments/[target]/[store-handle]`
- **Purpose**: Track content changes and deployment history
- **Automatic Updates**: Branches are updated automatically during deployments
- **Content Preservation**: JSON content files are committed to these branches

## How To Configure Deployment Targets

### Deployment Matrix Configuration

The deployment system uses a centralized configuration file at
[`devops/src/config/deployment-matrix.json`](/devops/src/config/deployment-matrix.json) to manage deployment targets and
their associated environments.

1. Configure [GitHub Environments](#github-environments) for each store you want to deploy to

2. Edit the deployment matrix configuration file
   [`devops/src/config/deployment-matrix.json`](/devops/src/config/deployment-matrix.json):

### Matrix Configuration Structure

- **byTarget**: Groups environments by deployment target (`dev-testing`, `dev-qa`, `uat`)
- **environment**: Array of store environments for each target
  - **name**: The Shopify store handle (must match the GitHub Environment name)
  - **contentOverridePatterns**: Permanent content override patterns for this environment (use `|||` as delimiter)

### Important Notes

- The `dev-testing` target must have exactly one environment
- The `dev-qa` and `uat` targets can have one or more environments
- When multiple environments are configured, deployments will run in parallel
- The JSON schema provides validation to ensure configuration correctness

# GitHub Environments

The CI/CD tasks use [GitHub Environments][github_environments] to target multiple Shopify stores.

Follow the steps below for each store you want to target:

1. Create `Vaan GitHub CI` [custom app][shopify_create_custom_app] in the target Shopify store

1. Verify the app has the following Admin API access scopes:

   - `read_locales`
   - `read_markets`
   - `read_product_listings`
   - `read_products`
   - `read_themes / write_themes`
   - `read_translations / write_translations`

   _The system needs to read locales and markets to synchronize theme translations_

1. On GitHub repository page, go to Settings -> Environments

1. Create new environment using the handle of the store as the environment name

   For example, the environment name should be `theme-starter-ci` for `theme-starter-ci.myshopify.com` store.

1. Add environment **secrets** using the information from the custom Shopify app:

   - `SHOPIFY_ADMIN_API_TOKEN` — Admin API access token value from API Credentials tab

1. Add environment **variables**:

   - `SHOPIFY_STOREFRONT_PASSWORD` — storefront lock password if the store is not open to public

     Set to `none` if the store doesn't have a storefront password.

   - `DEPLOYMENT_INITIAL_CONTENT_SOURCE` — source of content for theme deployments

     - Set to `live-theme` (default) if the store is already using your theme
     - Set to `git` if the store is using a legacy theme that you're replacing

All environment secrets and variables are required.

## CI/CD Task Structure

The CI/CD tasks are powered by GitHub Actions with a unified deployment system:

### DevOps Source Files

All DevOps source files are located in [/devops](/devops) and [/.github](/.github) folders.

### Workflow Architecture

- **Single Workflow**: `deploy-to-shopify.yml` handles all deployment targets
- **Configurable Targets**: Switch between `dev-testing`, `dev-qa`, and `uat` via parameters
- **Docker-based**: Uses the same containers as local development for consistency
- **Parallel Support**: Can deploy to multiple stores simultaneously

### Local Execution

You can run deployment tasks locally using Babashka:

```bash
# Deploy to a specific target
bb devops-deploy-to-shopify -t dev-qa -s prepare
bb devops-deploy-to-shopify -t dev-qa -s populate

# With content overrides
bb devops-deploy-to-shopify -t uat -s prepare -C "config/settings_data.json"
```

#### Task Steps

1. **Prepare**: Creates/updates deployment branch, syncs with main
2. **Populate**: Deploys theme files to Shopify, handles content preservation

## Theme Backup

The [Backup Themes CI task][backup_themes_workflow] runs every four hours so we can track changes in the
live theme and other themes to recover data in case of emergency or keep up with external content/development efforts.

The task downloads all files from the target theme of the specified store(s) and
saves the differences with the main branch as multiple commits in a separate git branch.

The backup branch pattern is `backup/[live | uat | other]/[theme name]/[store handle]`

# CI Authentication (`CHECKOUT_ACTION_PAT`)

> [!IMPORTANT]
> **Before you start:** Check if `CHECKOUT_ACTION_PAT` is already configured as an organization-level
> secret (**Organization Settings → Secrets and variables → Actions**). If the secret exists and CI
> workflows are passing, no action is needed — skip this section.

The CI workflows use a custom Personal Access Token (PAT) stored as the `CHECKOUT_ACTION_PAT`
repository secret. This token is used in place of the default `GITHUB_TOKEN` when checking out
code and pushing commits.

## Why a Custom PAT Is Required

All CI workflows use this token, for example [Run Tests][run_tests_workflow],
[Deploy to Shopify][deploy_workflow], [Backup Themes][backup_themes_workflow], and
[Track Themes][track_themes_workflow].

Several of these workflows push commits back to the branch during a run
(lockfile updates, prettify fixes, build artifacts). By design, pushes made with
the default `GITHUB_TOKEN` [do not trigger new workflow runs][github_token_trigger_limitation]
— this prevents infinite CI loops but also means subsequent checks would never
run on the auto-committed changes.

Using a custom PAT for the checkout ensures that commits pushed by CI are
attributed to the token owner and **do** trigger a new workflow run, so the full
test suite re-runs against the final state of the branch.

## Creating the Fine-Grained PAT

> [!NOTE]
> Log into GitHub as the account you want CI commits attributed to (e.g. a shared bot/service account).
> All commits pushed by CI will appear as authored by this user. The account must have write access
> to the repository.

1. Go to **Settings → Developer settings → [Personal access tokens → Fine-grained tokens][github_fine_grained_pat]**

2. Click **Generate new token**

3. Configure the token:

   - **Token name**: a descriptive name, e.g. `CI Checkout PAT — <repo name>`
   - **Expiration**: set to **Custom** and enter **300 days** (or [the longest duration your
     organization allows][github_pat_lifetime_policy]). Set a calendar reminder to rotate the
     token before it expires
   - **Repository access**: select **Only select repositories** and choose the target repository

4. Under **Permissions → Repository permissions**, grant:

   | Permission   | Access         |
   | ------------ | -------------- |
   | **Contents** | Read and write |
   | **Metadata** | Read-only      |

   _Contents RW is required so CI can push commits. Metadata RO is automatically included
   with any fine-grained token and cannot be removed._

5. Click **Generate token** and copy the value immediately — it won't be shown again

See the [GitHub documentation on fine-grained PATs][github_fine_grained_pat_docs] for full details.

## Adding the Secret to the Repository

1. Go to the repository **Settings → Secrets and variables → Actions**
2. Under **Repository secrets**, click **New repository secret**
3. Set the name to `CHECKOUT_ACTION_PAT` and paste the token value
4. Click **Add secret**

> **Note:** This is a _repository-level_ secret, not an environment secret. It is available to all
> workflows in the repository.

## Token Rotation

When the token expires, CI workflows will fail at the checkout step. To rotate:

1. Generate a new token following the steps above
2. Update the `CHECKOUT_ACTION_PAT` repository secret with the new value
3. Delete the old token from your [personal access tokens page][github_fine_grained_pat]

<!-- Links -->

[github_environments]: https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment
[shopify_create_custom_app]: https://help.shopify.com/en/manual/apps/app-types/custom-apps
[backup_themes_workflow]: .github/workflows/backup-themes.yml
[deploy_workflow]: .github/workflows/deploy-to-shopify.yml
[track_themes_workflow]: .github/workflows/track-themes.yml
[run_tests_workflow]: .github/workflows/run-tests.yml
[github_token_trigger_limitation]: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow
[github_fine_grained_pat]: https://github.com/settings/personal-access-tokens
[github_fine_grained_pat_docs]: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token
[github_pat_lifetime_policy]: https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/setting-a-personal-access-token-policy-for-your-organization#enforcing-a-maximum-lifetime-policy-for-personal-access-tokens
