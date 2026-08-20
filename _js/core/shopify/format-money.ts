const MONEY_FORMAT = '${{amount}}'

const format = (t = 0, e = 2, o = ',', i = '.') => {
  if (isNaN(t)) {
    return '0'
  }

  const r = (t / 100).toFixed(e).split('.')
  const part: string = r[0] || ''

  return (
    part.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + o) + (r[1] ? i + r[1] : '')
  )
}

const r = /\{\{\s*(\w+)\s*\}\}/

export const formatMoney = (t: number, e = MONEY_FORMAT): string => {
  const a = e || MONEY_FORMAT

  const foundMatches = r.exec(a)

  if (!foundMatches) {
    throw new Error('Money template has no `{{amount}}` placeholder')
  }

  const formatName: string | undefined = foundMatches[1]

  const i: string =
    formatName === 'amount'
      ? format(t, 2)
      : formatName === 'amount_no_decimals'
        ? format(t, 0)
        : formatName === 'amount_with_comma_separator'
          ? format(t, 2, '.', ',')
          : formatName === 'amount_with_space_separator'
            ? format(t, 2, ' ', ',')
            : formatName === 'amount_with_period_and_space_separator'
              ? format(t, 2, ' ', '.')
              : formatName === 'amount_no_decimals_with_comma_separator'
                ? format(t, 0, '.', ',')
                : formatName === 'amount_no_decimals_with_space_separator'
                  ? format(t, 0, ' ')
                  : formatName === 'amount_with_apostrophe_separator'
                    ? format(t, 2, "'", '.')
                    : t.toString(10)

  return a.replace(r, i)
}

// Formats money but drops the fractional part when it is all zeros
// (e.g. `$65.00` becomes `$65`). The trailing `00` is only ever produced by a
// whole amount, and the lookahead guards against stripping thousands groups.
export const formatMoneyTrimmed = (t: number, e = MONEY_FORMAT): string =>
  formatMoney(t, e).replace(/([.,])00(?=\D*$)/, '')
