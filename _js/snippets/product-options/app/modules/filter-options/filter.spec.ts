import test from 'ava'
import { macro, o } from './_spec-helpers.js'

const optionNames = ['Size', 'Color', 'Material']
const variants = [
  // Size S
  {
    available: true,
    options: ['S', 'Blue', 'Leather']
  },
  {
    available: true,
    options: ['S', 'Red', 'Leather']
  },
  // Size M
  {
    available: true,
    options: ['M', 'Green', 'Leather']
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
    available: true,
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
    [o('Blue', 'selected'), o('Red'), o('Green', 'unavailable')],
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
    [o('Blue'), o('Red', 'selected'), o('Green', 'unavailable')],
    [o('Leather', 'selected'), o('Plastic', 'unavailable')]
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
    [o('Blue'), o('Red'), o('Green', 'selected')],
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
    [o('Blue', 'selected'), o('Red'), o('Green', 'unavailable')],
    [o('Leather'), o('Plastic', 'selected')]
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
    [o('Blue'), o('Red', 'selected'), o('Green', 'unavailable')],
    [o('Leather'), o('Plastic', 'selected')]
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
    [o('S'), o('M', 'selected'), o('L')],
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
    [o('S'), o('M', 'selected'), o('L')],
    [o('Blue', 'unavailable'), o('Red', 'selected'), o('Green')],
    [o('Leather', 'selected'), o('Plastic')]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Size: 'L', Color: 'Blue', Material: 'Leather' }
  },
  [
    [o('S'), o('M'), o('L', 'selected')],
    [o('Blue', 'selected'), o('Red', 'unavailable'), o('Green')],
    [o('Leather', 'selected'), o('Plastic', 'unavailable')]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Size: 'L', Color: 'Red', Material: 'Leather' }
  },
  [
    [o('S'), o('M'), o('L', 'selected')],
    [o('Blue'), o('Red', 'selected'), o('Green')],
    [o('Leather', 'selected'), o('Plastic', 'unavailable')]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Size: 'L', Color: 'Green', Material: 'Leather' }
  },
  [
    [o('S'), o('M'), o('L', 'selected')],
    [o('Blue'), o('Red', 'unavailable'), o('Green', 'selected')],
    [o('Leather', 'selected'), o('Plastic')]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Size: 'L', Color: 'Red', Material: 'Plastic' }
  },
  [
    [o('S'), o('M'), o('L', 'selected')],
    [o('Blue'), o('Red', 'selected'), o('Green')],
    [o('Leather', 'unavailable'), o('Plastic', 'selected')]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Size: 'L', Color: 'Green', Material: 'Plastic' }
  },
  [
    [o('S'), o('M'), o('L', 'selected')],
    [o('Blue'), o('Red', 'unavailable'), o('Green', 'selected')],
    [o('Leather'), o('Plastic', 'selected')]
  ]
)

test(
  'should handle unselected first option',
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Color: 'Blue', Material: 'Leather' }
  },
  [
    [o('S'), o('M'), o('L')],
    [o('Blue', 'selected'), o('Red'), o('Green')],
    [o('Leather', 'selected'), o('Plastic', 'unavailable')]
  ]
)
