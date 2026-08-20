import { DevOpsError } from '../errors/index.js'
import { kebabCase } from '../string/kebab-case.js'

const RESTRICTED_NAMES = [
  'annotation-xml',
  'color-profile',
  'font-face',
  'font-face-src',
  'font-face-uri',
  'font-face-format',
  'font-face-name',
  'missing-glyph'
]

export const parseWebComponentName = (_name: string): string => {
  if (!_name) {
    throw new DevOpsError('Web component name is required', { name: _name })
  }

  const handleizedName = kebabCase(_name)

  if (_name !== handleizedName) {
    throw new DevOpsError('Web component name must be in kebab-case', {
      name: _name,
      handleizedName
    })
  }

  if (_name.includes('-') === false) {
    throw new DevOpsError('Web component name must contain a dash', {
      name: _name
    })
  }

  if (RESTRICTED_NAMES.includes(_name)) {
    throw new DevOpsError(
      'Web component name must not be one of the restricted names',
      {
        name: _name
      }
    )
  }

  return _name
}
