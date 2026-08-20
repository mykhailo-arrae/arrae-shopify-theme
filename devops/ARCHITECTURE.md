# Technical Architecture Overview: Vaan Theme Starter

The Vaan Theme Starter (internally codenamed "VaanGo") is a sophisticated and
modern foundation for building bespoke Shopify themes. It is designed to
maximize developer productivity, ensure high-quality code, deliver exceptional
storefront performance, and provide a maintainable and scalable codebase.

VaanGo represents a significant investment in modern web development practices
and tools tailored for the Shopify ecosystem. Ultimately, it benefits both our
clients through superior deliverables and our team through an empowered
development process.

## Core Principles

Our theme starter is built upon the following core principles:

- **Modularity & Reusability**: Emphasizing a component-based architecture to
  promote code reuse, simplify maintenance, and accelerate development.
- **Performance First**: We optimize for speed using modern build tools,
  efficient asset loading, and adherence to web performance best practices.
- **Superior Developer Experience (DX)**: Providing a consistent, efficient,
  and enjoyable development environment with fast builds, robust tooling, and
  clear conventions.
- **Maintainability & Scalability**: Ensuring themes are easy to understand,
  update, and extend throughout their lifecycle.
- **Quality & Security**: Integrating automated checks, linters, and security
  best practices into day-to-day development processes helps maintain high-quality code
  and adherence to Shopify standards.
- **DevOps Excellence & Automation**: We prioritize a consistent, reliable, and
  automated development lifecycle from local development through to deployment
  to ensure parity across all environments.

## Key Technical Components

### Standardized Development Environment

A Docker-based development environment provides an identical, isolated, and
reproducible environment for every development session and every CI/CD job.
This eliminates inconsistencies between local setups and the build server,
ensuring that "it works on my machine" translates to "it works everywhere."

The environment provides a consistent, simplified, and automated command-line
interface with autocompletion for all common development and operational tasks
(e.g., bb build, bb ci, bb deploy). It automates complex sequences of
operations, reduces cognitive load for developers, and ensures that tasks are
executed uniformly.

### Modular Design

Vaan has implemented a set of theme-focused features that dramatically simplify asset management and promote modular design.

- **Portable Sections**: Self-contained units that colocate Liquid and SCSS
  source files (compiled into CSS modules for scoped styles) as well as optional
  JavaScript/TypeScript files.
  This allows for the easy addition, removal, or modification of sections
  with minimal risk of side effects.
- **Portable Snippets**: Similar to portable sections, these are reusable UI
  components with their own Liquid, CSS modules, and TypeScript.
- **Portable Web Components**: These are framework-agnostic, encapsulated UI
  elements with Shadow DOM styling. This enhances reusability and
  interoperability, especially for complex, interactive components.

### Advanced Asset Management

A fully automated custom asset loader ensures that JavaScript and CSS assets
for sections, snippets, and web components are loaded on-demand only when they
are present on the page, significantly improving initial page load times.

The asset loader system uses the SWC Typescript compiler, Rspack, and esbuild
for extremely fast and efficient asset bundling. This enables features like
tree-shaking and smart code splitting.

### Integrated Quality Assurance

The development environment includes a complete continuous integration (CI)
suite for running unit and integration tests. This automated safety net catches
regressions and ensures code reliability.

The CI suite can be run locally, eliminating the need for a remote CI/CD system. The suite includes:

- Comprehensive static type checking with TypeScript and type-aware ESLint configuration.
- An exhaustive set of linters (ESLint, Stylelint, and Biome) to enforce code style,
  formatting consistency, and identify potential bugs in JavaScript/TypeScript and SCSS.
- Shopify Theme Check, which ensures themes adhere to Shopify's standards and best
  practices by identifying potential issues before deployment.

### Robust Remote CI/CD Pipeline

Vaan prefers GitHub Actions for CI/CD operations. However, the included CI/CD
pipeline configuration can be adapted to any CI engine with minimal changes
because each workflow is fully encapsulated in Docker container.

The CI/CD pipeline configuration precisely mirrors the local Dockerized development
environment. This ensures that code that passes tests and builds
locally will behave identically in the CI pipeline and, consequently, in
deployed themes. The result is highly reliable deployments.

Theme deployments are fully automated and update the testing (e.g., "Vaan DEV Testing"
themes) and QA/UAT releases (e.g., "Vaan Dev QA" and "Vaan UAT" themes) environments.
The deployments journal each deployment attempt as Git commits in a dedicated
branch, providing a clear audit trail and simplifying rollbacks, and aiding in
debugging deployment-related issues.

The Theme Backup system runs scheduled GitHub Actions (`backup-themes`,
`track-themes`) to automatically back up live themes and other critical themes.
These changes are committed to dedicated Git branches, which preserves the history of
deployments for safe disaster recovery and regression investigations.

The CI/CD pipeline features are optional. Clients can start using the
development environment only without having to adopt the theme deployments or theme
backups immediately.

## Business Benefits

- **Faster Time-to-Market**: Efficient development workflows and reusable
  components accelerate the theme development process.
- **High-Quality & Performant Themes**: Modern tooling, optimized asset
  loading, and rigorous QA processes result in fast, reliable, and well-built
  storefronts.
- **Improved Maintainability**: A modular and well-organized codebase makes
  themes easier to update, extend, and troubleshoot. This facilitates smoother future
  upgrades and reduces long-term costs.
- **Scalability**: The architecture is designed to handle complex features and
  future growth without compromising performance or code quality.
- **Adherence to Best Practices**: Built-in checks ensure that themes adhere to Shopify's
  standards and web development best practices.

## Technical Benefits

- **Enhanced Productivity**: The Dockerized environment, streamlined task
  runner, and automated CI/CD processes significantly reduce development friction
  and manual effort. This allows developers to focus on feature implementation.
- **Consistency & Parity**: A standardized Docker environment ensures that all
  developers and the CI/CD pipeline operate with identical setups. This
  eliminates environment-specific bugs and enables seamless collaboration.
- **Reduced Onboarding Time**: New developers can become productive quickly due
  to the preconfigured, consistent environment and well-defined, automated
  workflows.
* **Improved Code Quality & Reliability**: Automated linting,formatting,
  and testing lead to higher code quality and fewer regressions.
- **Focus on Feature Development**: Automating builds, tests, deployments,
  and even theme backups frees up developers' time from mundane operational tasks.
- **Confidence in Deployments**: Strict CI/CD parity with local development,
  coupled with automated checks and deployment workflows, instills high
  confidence in the stability and reliability of each deployment.

## Self-Hosting the Development Environment

#### Ejecting the External Base Image

The development environment's `Dockerfile` uses a pre-built base image from
GitHub Container Registry (`ghcr.io/the-vaan-group/theme-starter`).

We intend to keep this image available to the public for as long as possible.
However, we cannot guarantee that it will always be available.

The images are versioned, so a pinned version should remain unchanged even if
newer versions are released, but we do not guarantee that newer images will be
compatible with your project without additional code changes.

To remove the external image dependency entirely, copy the full contents of the
upstream [Dockerfile](https://github.com/the-vaan-group/docker-theme-starter/blob/main/Dockerfile)
and replace the `FROM ghcr...` line in your project's `Dockerfile`:

```diff
- FROM ghcr.io/the-vaan-group/theme-starter:<version> AS foundation
+ FROM ruby:3.1.6 AS foundation
+ # ... paste the rest of the upstream Dockerfile here
```

This inlines the base image build steps into your own Dockerfile, giving you
full control over the project container image with no external registry dependency.
