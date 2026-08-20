/** @type {import('stylelint').Config} */
const config = {
  defaultSeverity: 'warning',
  extends: ['stylelint-config-standard-scss'],
  reportDescriptionlessDisables: true,
  reportInvalidScopeDisables: true,
  reportNeedlessDisables: true,
  rules: {
    'at-rule-empty-line-before': [null],
    'comment-empty-line-before': [null],
    'comment-whitespace-inside': [null],
    'declaration-empty-line-before': [null],
    'declaration-no-important': [true, { severity: 'warning' }],
    'media-feature-range-notation': [null],
    'no-invalid-position-at-import-rule': [null],
    'scss/at-mixin-argumentless-call-parentheses': [null],
    'scss/dollar-variable-empty-line-before': [null],
    'scss/dollar-variable-pattern': [
      '^([-_]?[a-z][a-z0-9]*)(-[a-z0-9]+)*$',
      { message: 'Expected variable to be kebab-case' }
    ],
    'selector-class-pattern': [
      '[a-z]+',
      { resolveNestedSelectors: true },
      { severity: 'warning' }
    ],
    'selector-id-pattern': [null],
    'selector-pseudo-class-no-unknown': [
      true,
      { ignorePseudoClasses: ['global'] }
    ],
    'shorthand-property-no-redundant-values': [null]
  }
}

module.exports = config
