import {
  inferRspackModuleFilePath,
  type RspackModule
} from './infer-module-file-path.js'

export const matchNodeModules = (module: RspackModule): boolean => {
  const resource = inferRspackModuleFilePath(module.identifier())

  return resource?.includes('node_modules') ?? false
}
