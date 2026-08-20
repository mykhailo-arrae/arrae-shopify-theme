import type { Plugin, ScriptableContext } from 'chart.js'
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip
} from 'chart.js'
import { prefersReducedMotion } from '../../core/accessibility/prefers-reduced-motion.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { makeVisibilityTracker } from '../../core/dom/visibility-tracker/index.js'
import { initSection } from '../../core/shopify/init-section/index.js'

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip
)

const CANVAS_SELECTOR = '.js-chart-canvas'
const DATA_SELECTOR = '.js-chart-data'
const CHART_SELECTOR = '.js-chart'
const LEGEND_ITEM_SELECTOR = '.js-chart-legend-item'

// Used when a dataset's `color` setting is left blank in the Theme Editor.
const FALLBACK_DATASET_COLORS = ['#f8a28c', '#efe7da']

// Lift the bars off the x-axis baseline by this many pixels on desktop only.
const DESKTOP_MEDIA_QUERY = '(min-width: 64em)'
const BAR_BOTTOM_MARGIN = 8

const LINE_BORDER_WIDTH = 1.5
const LINE_POINT_RADIUS = 9
const LINE_POINT_HOVER_RADIUS = 11

const TEXT_COLOR = '#3a3a3a'

type ChartKind = 'bar' | 'line'

type ParsedDataset = {
  key: string
  label: string
  color: string
  lineColor: string
  data: Array<number | null>
}

type ParsedConfig = {
  type: ChartKind
  labels: string[]
  yMin: number | null
  yMax: number | null
  yStep: number | null
  axisX: string
  axisY: string
  datasets: ParsedDataset[]
}

type ChartColors = {
  text: string
  axis: string
  grid: string
}

type CreatedChart = {
  chart: Chart
  datasetKeysInOrder: string[]
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

// Labels/values arrive as comma-separated strings from the Theme Editor,
// so we parse + validate them here
const splitToStrings = (value: unknown): string[] => {
  if (typeof value !== 'string') {
    return []
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

const splitToValues = (value: unknown): Array<number | null> => {
  if (typeof value !== 'string') {
    return []
  }

  return value.split(',').map((item) => {
    const trimmed = item.trim()

    if (trimmed === '') {
      return null
    }

    const parsed = Number.parseFloat(trimmed)

    return Number.isNaN(parsed) ? null : parsed
  })
}

const parseDataset = (value: unknown): ParsedDataset | null => {
  if (!isRecord(value)) {
    return null
  }

  const data = splitToValues(value.values)

  if (!data.some((point) => point !== null)) {
    return null
  }

  return {
    key: typeof value.key === 'string' ? value.key : '',
    label: typeof value.label === 'string' ? value.label : '',
    color: typeof value.color === 'string' ? value.color : '',
    lineColor: typeof value.lineColor === 'string' ? value.lineColor : '',
    data
  }
}

const parseConfig = (raw: string): ParsedConfig | null => {
  let json: unknown

  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isRecord(json)) {
    return null
  }

  const datasetsRaw = Array.isArray(json.datasets) ? json.datasets : []
  const datasets = datasetsRaw
    .map(parseDataset)
    .filter((dataset): dataset is ParsedDataset => dataset !== null)

  if (datasets.length === 0) {
    return null
  }

  return {
    type: json.type === 'line' ? 'line' : 'bar',
    labels: splitToStrings(json.labels),
    yMin: typeof json.yMin === 'number' ? json.yMin : null,
    yMax: typeof json.yMax === 'number' ? json.yMax : null,
    yStep: typeof json.yStep === 'number' ? json.yStep : null,
    axisX: typeof json.axisX === 'string' ? json.axisX : '',
    axisY: typeof json.axisY === 'string' ? json.axisY : '',
    datasets
  }
}

const withAlpha = (color: string, alpha: number): string => {
  const context = document.createElement('canvas').getContext('2d')

  if (context === null) {
    return color
  }

  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)

  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data

  if (red === undefined || green === undefined || blue === undefined) {
    return color
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

const readTextColor = (
  element: HTMLElement | null,
  fallback: string
): string => {
  if (element === null) {
    return fallback
  }

  const value = window.getComputedStyle(element).color

  return value === '' ? fallback : value
}

const resolveDatasetColor = (dataset: ParsedDataset, index: number): string => {
  if (dataset.color !== '') {
    return dataset.color
  }

  return (
    FALLBACK_DATASET_COLORS[index] ?? FALLBACK_DATASET_COLORS[0] ?? '#f8a28c'
  )
}

const createDashedGridPlugin = (gridColor: string): Plugin => {
  return {
    id: 'scienceDashedGrid',
    beforeDatasetsDraw(chart) {
      const yScale = chart.scales.y
      const area = chart.chartArea

      if (yScale === undefined) {
        return
      }

      const { ctx } = chart

      ctx.save()
      ctx.strokeStyle = gridColor
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])

      yScale.ticks.forEach((_tick, index) => {
        const y = yScale.getPixelForTick(index)

        // Skip the baseline — it overlaps the solid x-axis border.
        if (Math.abs(y - area.bottom) < 1) {
          return
        }

        ctx.beginPath()
        ctx.moveTo(area.left, y)
        ctx.lineTo(area.right, y)
        ctx.stroke()
      })

      ctx.restore()
    }
  }
}

// Scriptable bar `base` (in data units). On desktop it returns the value that
// sits `BAR_BOTTOM_MARGIN` pixels above the scale baseline (y min), so the
// bars float off the x-axis; on smaller screens it returns the scale min
// (bars sit on the baseline). Must use yScale.min — not 0 — so a non-zero
// merchant yMin still measures float offset from the visible axis.
const barBaseForMargin = (ctx: ScriptableContext<'bar'>): number => {
  const yScale = ctx.chart.scales.y

  if (yScale === undefined) {
    return 0
  }

  const scaleMin = yScale.min

  if (!window.matchMedia(DESKTOP_MEDIA_QUERY).matches) {
    return scaleMin
  }

  const baselinePixel = yScale.getPixelForValue(scaleMin)

  return yScale.getValueForPixel(baselinePixel - BAR_BOTTOM_MARGIN) ?? scaleMin
}

const createChart = (
  canvas: HTMLCanvasElement,
  parsed: ParsedConfig,
  colors: ChartColors,
  fontFamily: string,
  animate: boolean
): CreatedChart => {
  const plugins = [createDashedGridPlugin(colors.grid)]
  const labels = parsed.labels

  const datasetsWithColor = parsed.datasets.map((dataset, index) => ({
    dataset,
    color: resolveDatasetColor(dataset, index),
    lineColor: dataset.lineColor ?? colors.text
  }))
  const axisFont = { family: fontFamily, size: 16, weight: 500 }
  const tickFont = { family: fontFamily, size: 14, weight: 400 }
  const animation: false | { duration: number } = animate
    ? { duration: 600 }
    : false

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: colors.text,
        padding: 10,
        cornerRadius: 6,
        titleFont: tickFont,
        bodyFont: tickFont
      }
    },
    scales: {
      x: {
        title: {
          display: parsed.axisX !== '',
          text: parsed.axisX.toUpperCase(),
          color: colors.text,
          font: axisFont,
          padding: { top: 8 }
        },
        grid: { display: false },
        border: { display: true, color: colors.axis, width: 1 },
        ticks: { color: colors.text, font: tickFont, padding: 8 }
      },
      y: {
        min: parsed.yMin ?? 0,
        max: parsed.yMax ?? undefined,
        title: {
          display: parsed.axisY !== '',
          text: parsed.axisY.toUpperCase(),
          color: colors.text,
          font: axisFont
        },
        // Horizontal grid lines are drawn by the dashed-grid plugin.
        grid: { display: false },
        border: { display: true, color: colors.axis, width: 1 },
        ticks: {
          stepSize: parsed.yStep ?? undefined,
          color: colors.text,
          font: tickFont,
          padding: 8
        }
      }
    }
  }

  if (parsed.type === 'line') {
    const chart = new Chart(canvas, {
      type: 'line',
      plugins,
      data: {
        labels,
        datasets: datasetsWithColor.map(({ dataset, color, lineColor }) => {
          return {
            label: dataset.label,
            data: dataset.data,
            borderColor: lineColor,
            backgroundColor: color,
            pointBackgroundColor: color,
            pointBorderWidth: 0,
            borderWidth: LINE_BORDER_WIDTH,
            tension: 0,
            pointRadius: LINE_POINT_RADIUS,
            pointHoverRadius: LINE_POINT_HOVER_RADIUS,
            fill: false
          }
        })
      },
      options
    })

    return {
      chart,
      datasetKeysInOrder: datasetsWithColor.map(({ dataset }) => dataset.key)
    }
  }

  // Bars render with `secondary` first then `primary`, so reverse the order
  // and keep the key list aligned with the resulting chart dataset indices.
  const barDatasets = [...datasetsWithColor].reverse()

  const chart = new Chart(canvas, {
    type: 'bar',
    plugins,
    data: {
      labels,
      datasets: barDatasets.map(({ dataset, color }) => {
        return {
          label: dataset.label,
          data: dataset.data,
          backgroundColor: color,
          borderColor: color,
          base: barBaseForMargin,
          borderRadius: {
            topLeft: 4,
            topRight: 4,
            bottomLeft: 0,
            bottomRight: 0
          },
          borderSkipped: false,
          categoryPercentage: 0.88,
          barPercentage: 0.95,
          maxBarThickness: 43
        }
      })
    },
    options
  })

  return {
    chart,
    datasetKeysInOrder: barDatasets.map(({ dataset }) => dataset.key)
  }
}

initSection('.js-science-chart', (section) => {
  const canvas = findOneElement(section, CANVAS_SELECTOR)
  const dataScript = findOneElement(section, DATA_SELECTOR)

  if (!(canvas instanceof HTMLCanvasElement) || dataScript === null) {
    return { unload: null }
  }

  const parsed = parseConfig(dataScript.textContent ?? '')

  if (parsed === null) {
    return { unload: null }
  }

  const drawnDatasetKeys = new Set(
    parsed.datasets.map((dataset) => dataset.key)
  )

  findElements(section, LEGEND_ITEM_SELECTOR).forEach((item) => {
    const datasetKey = item.getAttribute('data-dataset-key')

    if (datasetKey !== null && !drawnDatasetKeys.has(datasetKey)) {
      item.hidden = true
    }
  })

  const textColor = readTextColor(
    findOneElement(section, CHART_SELECTOR) ?? section,
    TEXT_COLOR
  )

  const colors: ChartColors = {
    text: textColor,
    axis: withAlpha(textColor, 0.35),
    grid: withAlpha(textColor, 0.18)
  }

  const fontFamily = window.getComputedStyle(canvas).fontFamily || 'sans-serif'

  // Defer creating the chart until the section scrolls into view so the bars
  // animate in as the user reaches it (rather than off-screen on page load).
  let chart: Chart | null = null
  const datasetIndexByKey = new Map<string, number>()

  const ensureChart = (animate: boolean): void => {
    if (chart !== null) {
      return
    }

    const created = createChart(canvas, parsed, colors, fontFamily, animate)
    chart = created.chart
    created.datasetKeysInOrder.forEach((key, index) => {
      datasetIndexByKey.set(key, index)
    })
  }

  // Clicking a legend entry toggles its dataset.
  const legendItems = findElements(section, LEGEND_ITEM_SELECTOR)

  const onLegendClick = (event: Event): void => {
    const item = event.currentTarget

    if (!(item instanceof HTMLElement)) {
      return
    }

    const key = item.getAttribute('data-dataset-key')

    if (key === null) {
      return
    }

    ensureChart(false)

    const index = datasetIndexByKey.get(key)

    if (chart === null || index === undefined) {
      return
    }

    const nextVisible = !chart.isDatasetVisible(index)
    chart.setDatasetVisibility(index, nextVisible)
    chart.update()
    item.setAttribute('aria-pressed', nextVisible ? 'true' : 'false')
  }

  legendItems.forEach((item) => {
    if (item.hidden) {
      return
    }

    item.addEventListener('click', onLegendClick)
  })

  const tracker = makeVisibilityTracker({ threshold: [0.25] })

  tracker.track(canvas, ({ isVisible, untrack }) => {
    if (!isVisible || chart !== null) {
      return
    }

    ensureChart(!prefersReducedMotion())
    untrack()
  })

  return {
    unload: () => {
      tracker.destroy()
      legendItems.forEach((item) => {
        item.removeEventListener('click', onLegendClick)
      })
      chart?.destroy()
    }
  }
})
