import test from 'ava'

import { formatMoney } from './format-money.js'

test('Format Money utility given zero', async (t) => {
  t.is(formatMoney(0), '$0.00')
  t.is(formatMoney(0, '€{{amount}}'), '€0.00')
  t.is(formatMoney(0, '${{amount_with_comma_separator}}'), '$0,00')
  t.is(formatMoney(0, '${{amount_with_space_separator}}'), '$0,00')
  t.is(formatMoney(0, '${{amount_with_period_and_space_separator}}'), '$0.00')
  t.is(formatMoney(0, '${{amount_no_decimals_with_comma_separator}}'), '$0')
  t.is(formatMoney(0, '${{amount_no_decimals_with_space_separator}}'), '$0')
  t.is(formatMoney(0, '${{amount_with_apostrophe_separator}}'), '$0.00')
})

test('Format Money utility given 10 dollars', async (t) => {
  t.is(formatMoney(1000), '$10.00')
  t.is(formatMoney(1000, '€{{amount}}'), '€10.00')
  t.is(formatMoney(1000, '${{amount_with_comma_separator}}'), '$10,00')
  t.is(formatMoney(1000, '${{amount_with_space_separator}}'), '$10,00')
  t.is(
    formatMoney(1000, '${{amount_with_period_and_space_separator}}'),
    '$10.00'
  )
  t.is(formatMoney(1000, '${{amount_no_decimals_with_comma_separator}}'), '$10')
  t.is(formatMoney(1000, '${{amount_no_decimals_with_space_separator}}'), '$10')
  t.is(formatMoney(1000, '${{amount_with_apostrophe_separator}}'), '$10.00')
})

test('Format Money utility given 1000 dollars', async (t) => {
  t.is(formatMoney(100_000), '$1,000.00')
  t.is(formatMoney(100_000, '€{{amount}}'), '€1,000.00')
  t.is(formatMoney(100_000, '${{amount_with_comma_separator}}'), '$1.000,00')
  t.is(formatMoney(100_000, '${{amount_with_space_separator}}'), '$1 000,00')
  t.is(
    formatMoney(100_000, '${{amount_with_period_and_space_separator}}'),
    '$1 000.00'
  )
  t.is(
    formatMoney(100_000, '${{amount_no_decimals_with_comma_separator}}'),
    '$1.000'
  )
  t.is(
    formatMoney(100_000, '${{amount_no_decimals_with_space_separator}}'),
    '$1 000'
  )
  t.is(
    formatMoney(100_000, '${{amount_with_apostrophe_separator}}'),
    "$1'000.00"
  )
})
