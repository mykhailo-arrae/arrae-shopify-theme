import lazySizes from 'lazysizes'
import 'lazysizes/plugins/bgset/ls.bgset'

lazySizes.cfg.init = false

export const init = async (): Promise<void> => {
  lazySizes.init()
}
