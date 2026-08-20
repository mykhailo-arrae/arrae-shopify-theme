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
  }
  // {
  //   available: true,
  //   options: ['L', 'Red', 'Plastic']
  // }
]

test(
  'should omit the missing Size: L option',
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { Size: 'S', Color: 'Blue', Material: 'Leather' }
  },
  [
    [o('S', 'selected'), o('M')],
    [
      o('Blue', 'selected'),
      o('Red', 'out-of-stock'),
      o('Green', 'unavailable')
    ],
    [o('Leather', 'selected'), o('Plastic', 'unavailable')]
  ]
)
