import test from 'ava'
import { macro, o } from './_spec-helpers.js'

const optionNames = ['Band Size', 'Cup Size', 'General Size']
const variants = [
  {
    available: true,
    options: ['32', 'A', 'XS']
  },
  {
    available: true,
    options: ['32', 'A', 'S']
  },
  {
    available: true,
    options: ['32', 'A', 'M']
  },
  {
    available: true,
    options: ['32', 'B', 'XS']
  },
  {
    available: true,
    options: ['32', 'B', 'S']
  },
  {
    available: true,
    options: ['32', 'B', 'M']
  },
  {
    available: true,
    options: ['32', 'C', 'XS']
  },
  {
    available: true,
    options: ['32', 'C', 'S']
  },
  {
    available: true,
    options: ['32', 'C', 'M']
  },
  {
    available: true,
    options: ['32', 'D', 'XS']
  },
  {
    available: true,
    options: ['32', 'D', 'S']
  },
  {
    available: true,
    options: ['32', 'D', 'M']
  },
  {
    available: true,
    options: ['32', 'D', 'L']
  },
  {
    available: true,
    options: ['32', 'DD', 'S']
  },
  {
    available: true,
    options: ['32', 'DD', 'M']
  },
  {
    available: true,
    options: ['32', 'DD', 'L']
  },
  {
    available: true,
    options: ['32', 'F', 'S']
  },
  {
    available: true,
    options: ['32', 'F', 'M']
  },
  {
    available: true,
    options: ['32', 'F', 'L']
  },
  {
    available: true,
    options: ['34', 'A', 'S']
  },
  {
    available: true,
    options: ['34', 'A', 'M']
  },
  {
    available: true,
    options: ['34', 'A', 'L']
  },
  {
    available: true,
    options: ['34', 'B', 'S']
  },
  {
    available: true,
    options: ['34', 'B', 'M']
  },
  {
    available: true,
    options: ['34', 'B', 'L']
  },
  {
    available: true,
    options: ['34', 'C', 'S']
  },
  {
    available: true,
    options: ['34', 'C', 'M']
  },
  {
    available: true,
    options: ['34', 'C', 'L']
  },
  {
    available: true,
    options: ['34', 'D', 'S']
  },
  {
    available: true,
    options: ['34', 'D', 'M']
  },
  {
    available: true,
    options: ['34', 'D', 'L']
  },
  {
    available: true,
    options: ['34', 'DD', 'S']
  },
  {
    available: true,
    options: ['34', 'DD', 'M']
  },
  {
    available: true,
    options: ['34', 'DD', 'L']
  },
  {
    available: true,
    options: ['34', 'DD', 'XL']
  },
  {
    available: true,
    options: ['34', 'F', 'M']
  },
  {
    available: true,
    options: ['34', 'F', 'L']
  },
  {
    available: true,
    options: ['34', 'F', 'XL']
  },
  {
    available: true,
    options: ['36', 'A', 'M']
  },
  {
    available: true,
    options: ['36', 'A', 'L']
  },
  {
    available: true,
    options: ['36', 'A', 'XL']
  },
  {
    available: true,
    options: ['36', 'B', 'M']
  },
  {
    available: true,
    options: ['36', 'B', 'L']
  },
  {
    available: true,
    options: ['36', 'B', 'XL']
  },
  {
    available: true,
    options: ['36', 'C', 'M']
  },
  {
    available: true,
    options: ['36', 'C', 'L']
  },
  {
    available: true,
    options: ['36', 'C', 'XL']
  },
  {
    available: true,
    options: ['36', 'D', 'M']
  },
  {
    available: true,
    options: ['36', 'D', 'L']
  },
  {
    available: true,
    options: ['36', 'D', 'XL']
  },
  {
    available: true,
    options: ['36', 'DD', 'M']
  },
  {
    available: true,
    options: ['36', 'DD', 'L']
  },
  {
    available: true,
    options: ['36', 'DD', 'XL']
  },
  {
    available: true,
    options: ['36', 'DD', '2XL']
  },
  {
    available: true,
    options: ['36', 'F', 'L']
  },
  {
    available: true,
    options: ['36', 'F', 'XL']
  },
  {
    available: true,
    options: ['36', 'F', '2XL']
  },
  {
    available: true,
    options: ['38', 'A', 'L']
  },
  {
    available: true,
    options: ['38', 'A', 'XL']
  },
  {
    available: true,
    options: ['38', 'A', '2XL']
  },
  {
    available: true,
    options: ['38', 'B', 'L']
  },
  {
    available: true,
    options: ['38', 'B', 'XL']
  },
  {
    available: true,
    options: ['38', 'B', '2XL']
  },
  {
    available: true,
    options: ['38', 'C', 'L']
  },
  {
    available: true,
    options: ['38', 'C', 'XL']
  },
  {
    available: true,
    options: ['38', 'C', '2XL']
  },
  {
    available: true,
    options: ['38', 'D', 'L']
  },
  {
    available: true,
    options: ['38', 'D', 'XL']
  },
  {
    available: true,
    options: ['38', 'D', '2XL']
  },
  {
    available: true,
    options: ['38', 'DD', 'L']
  },
  {
    available: true,
    options: ['38', 'DD', 'XL']
  },
  {
    available: true,
    options: ['38', 'DD', '2XL']
  },
  {
    available: false,
    options: ['38', 'DD', '3XL']
  },
  {
    available: true,
    options: ['38', 'F', 'XL']
  },
  {
    available: true,
    options: ['38', 'F', '2XL']
  },
  {
    available: false,
    options: ['38', 'F', '3XL']
  },
  {
    available: true,
    options: ['40', 'B', 'XL']
  },
  {
    available: true,
    options: ['40', 'B', '2XL']
  },
  {
    available: false,
    options: ['40', 'B', '3XL']
  },
  {
    available: true,
    options: ['40', 'C', 'XL']
  },
  {
    available: true,
    options: ['40', 'C', '2XL']
  },
  {
    available: false,
    options: ['40', 'C', '3XL']
  },
  {
    available: true,
    options: ['40', 'D', 'XL']
  },
  {
    available: true,
    options: ['40', 'D', '2XL']
  },
  {
    available: false,
    options: ['40', 'D', '3XL']
  },
  {
    available: true,
    options: ['40', 'DD', 'XL']
  },
  {
    available: true,
    options: ['40', 'DD', '2XL']
  },
  {
    available: false,
    options: ['40', 'DD', '3XL']
  },
  {
    available: true,
    options: ['40', 'F', 'XL']
  },
  {
    available: true,
    options: ['40', 'F', '2XL']
  },
  {
    available: false,
    options: ['40', 'F', '3XL']
  },
  {
    available: true,
    options: ['42', 'DD', 'XL']
  },
  {
    available: true,
    options: ['42', 'DD', '2XL']
  },
  {
    available: false,
    options: ['42', 'DD', '3XL']
  },
  {
    available: true,
    options: ['42', 'F', 'XL']
  },
  {
    available: true,
    options: ['42', 'F', '2XL']
  },
  {
    available: false,
    options: ['42', 'F', '3XL']
  }
]

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: {
      'Band Size': '32',
      'Cup Size': 'A',
      'General Size': 'XS'
    }
  },
  [
    [o('32', 'selected'), o('34'), o('36'), o('38'), o('40'), o('42')],
    [o('A', 'selected'), o('B'), o('C'), o('D'), o('DD'), o('F')],
    [
      o('XS', 'selected'),
      o('S'),
      o('M'),
      o('L', 'unavailable'),
      o('XL', 'unavailable'),
      o('2XL', 'unavailable'),
      o('3XL', 'unavailable')
    ]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: {
      'Band Size': '32',
      'Cup Size': 'DD',
      'General Size': 'S'
    }
  },
  [
    [o('32', 'selected'), o('34'), o('36'), o('38'), o('40'), o('42')],
    [o('A'), o('B'), o('C'), o('D'), o('DD', 'selected'), o('F')],
    [
      o('XS', 'unavailable'),
      o('S', 'selected'),
      o('M'),
      o('L'),
      o('XL', 'unavailable'),
      o('2XL', 'unavailable'),
      o('3XL', 'unavailable')
    ]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: {
      'Band Size': '38',
      'Cup Size': 'A',
      'General Size': 'XS'
    }
  },
  [
    [o('32'), o('34'), o('36'), o('38', 'selected'), o('40'), o('42')],
    [o('A', 'selected'), o('B'), o('C'), o('D'), o('DD'), o('F')],
    [
      o('XS', 'selected'),
      o('S', 'unavailable'),
      o('M', 'unavailable'),
      o('L'),
      o('XL'),
      o('2XL'),
      o('3XL', 'unavailable')
    ]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: {
      'Band Size': '38',
      'Cup Size': 'DD',
      'General Size': 'L'
    }
  },
  [
    [o('32'), o('34'), o('36'), o('38', 'selected'), o('40'), o('42')],
    [o('A'), o('B'), o('C'), o('D'), o('DD', 'selected'), o('F')],
    [
      o('XS', 'unavailable'),
      o('S', 'unavailable'),
      o('M', 'unavailable'),
      o('L', 'selected'),
      o('XL'),
      o('2XL'),
      o('3XL', 'out-of-stock')
    ]
  ]
)
