import test from 'ava'
import { macro, o } from './_spec-helpers.js'

const optionNames = ['Size', 'Color', 'Material']
const variants = [
  // Size S
  {
    available: false,
    options: ['S', 'Blue', 'Leather']
  },
  {
    available: false,
    options: ['S', 'Red', 'Leather']
  },
  {
    available: false,
    options: ['S', 'Red', 'Plastic']
  },
  // Size M
  {
    available: true,
    options: ['M', 'Green', 'Leather']
  },
  {
    available: false,
    options: ['M', 'Green', 'Plastic']
  },
  {
    available: true,
    options: ['M', 'Red', 'Leather']
  },
  {
    available: true,
    options: ['M', 'Red', 'Plastic']
  },
  // Size L
  {
    available: true,
    options: ['L', 'Blue', 'Leather']
  },
  {
    available: true,
    options: ['L', 'Green', 'Leather']
  },
  {
    available: false,
    options: ['L', 'Green', 'Plastic']
  }
]

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Size: 'S', Color: 'Blue', Material: 'Leather' }
  },
  [
    [o('S', 'selected'), o('M'), o('L')],
    [
      o('Blue', 'selected'),
      o('Red', 'out-of-stock'),
      o('Green', 'unavailable')
    ],
    [o('Leather', 'selected'), o('Plastic', 'unavailable')]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Size: 'S', Color: 'Red', Material: 'Leather' }
  },
  [
    [o('S', 'selected'), o('M'), o('L')],
    [
      o('Blue', 'out-of-stock'),
      o('Red', 'selected'),
      o('Green', 'unavailable')
    ],
    [o('Leather', 'selected'), o('Plastic', 'out-of-stock')]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Size: 'S', Color: 'Green', Material: 'Leather' }
  },
  [
    [o('S', 'selected'), o('M'), o('L')],
    [
      o('Blue', 'out-of-stock'),
      o('Red', 'out-of-stock'),
      o('Green', 'selected')
    ],
    [o('Leather', 'selected'), o('Plastic', 'unavailable')]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Size: 'S', Color: 'Blue', Material: 'Plastic' }
  },
  [
    [o('S', 'selected'), o('M'), o('L')],
    [
      o('Blue', 'selected'),
      o('Red', 'out-of-stock'),
      o('Green', 'unavailable')
    ],
    [o('Leather', 'out-of-stock'), o('Plastic', 'selected')]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Size: 'S', Color: 'Red', Material: 'Plastic' }
  },
  [
    [o('S', 'selected'), o('M'), o('L')],
    [
      o('Blue', 'out-of-stock'),
      o('Red', 'selected'),
      o('Green', 'unavailable')
    ],
    [o('Leather', 'out-of-stock'), o('Plastic', 'selected')]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Size: 'S', Color: 'Green', Material: 'Plastic' }
  },
  [
    [o('S', 'selected'), o('M'), o('L')],
    [
      o('Blue', 'out-of-stock'),
      o('Red', 'out-of-stock'),
      o('Green', 'selected')
    ],
    [o('Leather', 'unavailable'), o('Plastic', 'selected')]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Size: 'M', Color: 'Blue', Material: 'Leather' }
  },
  [
    [o('S', 'out-of-stock'), o('M', 'selected'), o('L')],
    [o('Blue', 'selected'), o('Red'), o('Green')],
    [o('Leather', 'selected'), o('Plastic', 'unavailable')]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Size: 'M', Color: 'Red', Material: 'Leather' }
  },
  [
    [o('S', 'out-of-stock'), o('M', 'selected'), o('L')],
    [o('Blue', 'unavailable'), o('Red', 'selected'), o('Green')],
    [o('Leather', 'selected'), o('Plastic')]
  ]
)
