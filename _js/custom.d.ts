declare module 'stent' {
  export const Machine: {
    addMiddleware(middleware: {
      onStateChanged(this: {
        name: string
        state: { name: string }
      }): void
    }): void

    create(
      name: string,
      config: {
        state: { name: string }
        transitions: Record<string, Partial<Record<string, unknown>>>
      }
    ): unknown
  }
}

declare module 'stent/lib/helpers' {
  export function connect<M>(): {
    with: (name: string) => {
      // added phantom prop to silence strict lint rule
      _internal: M
      map: (callback: (machine: M) => void) => () => void
    }
  }
}

// Uncomment the block if the project uses Algolia React Instant Search
// declare module 'algoliasearch/dist/algoliasearch-lite.esm.browser' {
//   export * from 'algoliasearch/dist/algoliasearch-lite'
//   export { default } from 'algoliasearch/dist/algoliasearch-lite'
// }
// declare module 'algoliasearch/dist/algoliasearch-lite.esm.browser.js' {
//   export * from 'algoliasearch/dist/algoliasearch-lite'
//   export { default } from 'algoliasearch/dist/algoliasearch-lite'
// }
