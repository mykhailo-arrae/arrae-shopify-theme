import test from 'ava'
import { macro, o } from './_spec-helpers.js'

const optionNames = ['Frame Size', 'Color']

const stepthrough_mango = {
  id: 41_310_255_644_855,
  available: true,
  options: ['Step-Thru', 'Mango']
}
const stepthrough_cyan = {
  id: 41_310_255_710_391,
  available: true,
  options: ['Step-Thru', 'Cyan']
}
const stepthrough_skyblue = {
  id: 41_314_586_067_127,
  available: false,
  options: ['Step-Thru', 'Sky Blue']
}
const stepthrough_spring = {
  id: 41_314_586_132_663,
  available: true,
  options: ['Step-Thru', 'Spring']
}
const stepthrough_indigogray = {
  id: 41_805_979_025_591,
  available: true,
  options: ['Step-Thru', 'Indigo Gray']
}
const stepthrough_forest = {
  id: 41_806_000_881_847,
  available: true,
  options: ['Step-Thru', 'Forest']
}
const highstep_mango = {
  id: 41_310_255_775_927,
  available: true,
  options: ['High-Step', 'Mango']
}
const highstep_indigogray = {
  id: 41_310_255_808_695,
  available: false,
  options: ['High-Step', 'Indigo Gray']
}
const highstep_forest = {
  id: 41_314_586_427_575,
  available: true,
  options: ['High-Step', 'Forest']
}
const highstep_sand = {
  id: 41_314_586_329_271,
  available: false,
  options: ['High-Step', 'Sand']
}

const variants = [
  stepthrough_mango,
  stepthrough_cyan,
  stepthrough_skyblue,
  stepthrough_spring,
  stepthrough_indigogray,
  stepthrough_forest,
  highstep_mango,
  highstep_indigogray,
  highstep_forest,
  highstep_sand
]

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { 'Frame Size': 'Step-Thru', Color: 'Mango' }
  },
  [
    [o('Step-Thru', 'selected'), o('High-Step')],
    [
      o('Mango', 'selected'),
      o('Cyan'),
      o('Sky Blue', 'out-of-stock'),
      o('Spring'),
      o('Indigo Gray'),
      o('Forest'),
      o('Sand', 'unavailable')
    ]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { 'Frame Size': 'Step-Thru', Color: 'Cyan' }
  },
  [
    [o('Step-Thru', 'selected'), o('High-Step')],
    [
      o('Mango'),
      o('Cyan', 'selected'),
      o('Sky Blue', 'out-of-stock'),
      o('Spring'),
      o('Indigo Gray'),
      o('Forest'),
      o('Sand', 'unavailable')
    ]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { 'Frame Size': 'Step-Thru', Color: 'Sand' }
  },
  [
    [o('Step-Thru', 'selected'), o('High-Step')],
    [
      o('Mango'),
      o('Cyan'),
      o('Sky Blue', 'out-of-stock'),
      o('Spring'),
      o('Indigo Gray'),
      o('Forest'),
      o('Sand', 'selected')
    ]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { 'Frame Size': 'High-Step', Color: 'Mango' }
  },
  [
    [o('Step-Thru'), o('High-Step', 'selected')],
    [
      o('Mango', 'selected'),
      o('Cyan', 'unavailable'),
      o('Sky Blue', 'unavailable'),
      o('Spring', 'unavailable'),
      o('Indigo Gray', 'out-of-stock'),
      o('Forest'),
      o('Sand', 'out-of-stock')
    ]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { 'Frame Size': 'High-Step', Color: 'Indigo Gray' }
  },
  [
    [o('Step-Thru'), o('High-Step', 'selected')],
    [
      o('Mango'),
      o('Cyan', 'unavailable'),
      o('Sky Blue', 'unavailable'),
      o('Spring', 'unavailable'),
      o('Indigo Gray', 'selected'),
      o('Forest'),
      o('Sand', 'out-of-stock')
    ]
  ]
)

test(
  macro,
  {
    optionNames,
    variants,
    selectedOptions: { 'Frame Size': 'High-Step', Color: 'Sand' }
  },
  [
    [o('Step-Thru'), o('High-Step', 'selected')],
    [
      o('Mango'),
      o('Cyan', 'unavailable'),
      o('Sky Blue', 'unavailable'),
      o('Spring', 'unavailable'),
      o('Indigo Gray', 'out-of-stock'),
      o('Forest'),
      o('Sand', 'selected')
    ]
  ]
)
