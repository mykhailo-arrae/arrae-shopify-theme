/*!
 * Ported from Lodash
 */

/** Used to compose unicode character classes. */
const rsAstralRange = String.raw`\ud800-\udfff`
const rsComboMarksRange = String.raw`\u0300-\u036f`
const reComboHalfMarksRange = String.raw`\ufe20-\ufe2f`
const rsComboSymbolsRange = String.raw`\u20d0-\u20ff`
const rsComboMarksExtendedRange = String.raw`\u1ab0-\u1aff`
const rsComboMarksSupplementRange = String.raw`\u1dc0-\u1dff`
const rsComboRange =
  rsComboMarksRange +
  reComboHalfMarksRange +
  rsComboSymbolsRange +
  rsComboMarksExtendedRange +
  rsComboMarksSupplementRange
const rsDingbatRange = String.raw`\u2700-\u27bf`
const rsLowerRange = String.raw`a-z\xdf-\xf6\xf8-\xff`
const rsMathOpRange = String.raw`\xac\xb1\xd7\xf7`
const rsNonCharRange = String.raw`\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\xbf`
const rsPunctuationRange = String.raw`\u2000-\u206f`
const rsSpaceRange = String.raw` \t\x0b\f\xa0\ufeff\n\r\u2028\u2029\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000`
const rsUpperRange = String.raw`A-Z\xc0-\xd6\xd8-\xde`
const rsVarRange = String.raw`\ufe0e\ufe0f`
const rsBreakRange =
  rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange

/** Used to compose unicode capture groups. */
const rsApos = "['\u2019]"
const rsBreak = `[${rsBreakRange}]`
const rsCombo = `[${rsComboRange}]`
const rsDigit = String.raw`\d`
const rsDingbat = `[${rsDingbatRange}]`
const rsLower = `[${rsLowerRange}]`
const rsMisc = `[^${rsAstralRange}${
  rsBreakRange + rsDigit + rsDingbatRange + rsLowerRange + rsUpperRange
}]`
const rsFitz = String.raw`\ud83c[\udffb-\udfff]`
const rsModifier = `(?:${rsCombo}|${rsFitz})`
const rsNonAstral = `[^${rsAstralRange}]`
const rsRegional = String.raw`(?:\ud83c[\udde6-\uddff]){2}`
const rsSurrPair = String.raw`[\ud800-\udbff][\udc00-\udfff]`
const rsUpper = `[${rsUpperRange}]`
const rsZWJ = String.raw`\u200d`

/** Used to compose unicode regexes. */
const rsMiscLower = `(?:${rsLower}|${rsMisc})`
const rsMiscUpper = `(?:${rsUpper}|${rsMisc})`
const rsOptContrLower = `(?:${rsApos}(?:d|ll|m|re|s|t|ve))?`
const rsOptContrUpper = `(?:${rsApos}(?:D|LL|M|RE|S|T|VE))?`
const reOptMod = `${rsModifier}?`
const rsOptVar = `[${rsVarRange}]?`
const rsOptJoin = `(?:${rsZWJ}(?:${[rsNonAstral, rsRegional, rsSurrPair].join(
  '|'
)})${rsOptVar + reOptMod})*`
const rsOrdLower = String.raw`\d*(?:1st|2nd|3rd|(?![123])\dth)(?=\b|[A-Z_])`
const rsOrdUpper = String.raw`\d*(?:1ST|2ND|3RD|(?![123])\dTH)(?=\b|[a-z_])`
const rsSeq = rsOptVar + reOptMod + rsOptJoin
const rsEmoji = `(?:${[rsDingbat, rsRegional, rsSurrPair].join('|')})${rsSeq}`

const reUnicodeWords = RegExp(
  [
    `${rsUpper}?${rsLower}+${rsOptContrLower}(?=${[rsBreak, rsUpper, '$'].join(
      '|'
    )})`,
    `${rsMiscUpper}+${rsOptContrUpper}(?=${[
      rsBreak,
      rsUpper + rsMiscLower,
      '$'
    ].join('|')})`,
    `${rsUpper}?${rsMiscLower}+${rsOptContrLower}`,
    `${rsUpper}+${rsOptContrUpper}`,
    rsOrdUpper,
    rsOrdLower,
    `${rsDigit}+`,
    rsEmoji
  ].join('|'),
  'g'
)

/**
 * Splits a Unicode `string` into an array of its words.
 *
 * @private
 * @param {string} The string to inspect.
 * @returns {Array} Returns the words of `string`.
 */
const unicodeWords = (string: string) => {
  return string.match(reUnicodeWords)
}

const hasUnicodeWord = RegExp.prototype.test.bind(
  /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/
)

/** Used to match words composed of alphanumeric characters. */
/* eslint-disable-next-line no-control-regex */
const reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g

const asciiWords = (string: string) => {
  return string.match(reAsciiWord)
}

/**
 * Splits `string` into an array of its words.
 *
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to inspect.
 * @param {RegExp|string} [pattern] The pattern to match words.
 * @returns {Array} Returns the words of `string`.
 * @example
 *
 * words('fred, barney, & pebbles')
 * // => ['fred', 'barney', 'pebbles']
 *
 * words('fred, barney, & pebbles', /[^, ]+/g)
 * // => ['fred', 'barney', '&', 'pebbles']
 */
const words = (string: string, pattern?: RegExp): string[] => {
  if (pattern === undefined) {
    const result = hasUnicodeWord(string)
      ? unicodeWords(string)
      : asciiWords(string)
    return result || []
  }
  return string.match(pattern) || []
}

/**
 * Converts `string` to
 * [kebab case](https://en.wikipedia.org/wiki/Letter_case#Special_case_styles).
 *
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to convert.
 * @returns {string} Returns the kebab cased string.
 * @example
 *
 * kebabCase('Foo Bar')
 * // => 'foo-bar'
 *
 * kebabCase('fooBar')
 * // => 'foo-bar'
 *
 * kebabCase('__FOO_BAR__')
 * // => 'foo-bar'
 */
export const kebabCase = (string: string): string =>
  words(string.replace(/['\u2019]/g, '')).reduce(
    (result: string, word: string, index: number) =>
      result + (index ? '-' : '') + word.toLowerCase(),
    ''
  )
