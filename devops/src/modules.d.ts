// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface Plugin extends Processors {
  postcssPlugin: string
  prepare?: (result: Result) => Processors
}

declare module 'bourbon' {
  export const includePaths: string[]
}

declare module 'vinyl-map2' {
  export default function map(
    mapper: (
      contents: string | Buffer,
      filepath: string,
      done: (err: Error | null, result?: string | Buffer) => void
    ) => void
  ): NodeJS.ReadWriteStream
}

declare module '@hail2u/css-mqpacker' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export default function pack(): any
}

declare module '*.shadow.scss' {
  export const shadowStyles: string
}

declare module 'glogg' {
  export default function logger(namespace: string): {
    removeAllListeners(): void
    on(event: string, listener: (...args: unknown[]) => void): void
  }
}
