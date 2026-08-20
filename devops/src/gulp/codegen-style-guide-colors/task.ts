import fs from 'node:fs/promises'
import Path from 'node:path'
import type { Color } from 'culori'
import { formatHex, parse } from 'culori'
import type { Task } from '../../core/fs/watcher/with-file-changes.js'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { workdir } from '../../core/process/workdir.js'

const NAME = 'codegen-style-guide-colors'

const logger = initLogger().with({ name: NAME })
const logErrorDetails = makeLogErrorDetails(logger)

const COLORS_SCSS_PATH = Path.resolve(
  workdir,
  '_sass/core/style-guide/_colors.scss'
)
const SECTION_LIQUID_PATH = Path.resolve(
  workdir,
  '_js/sections/style-guide/section.liquid'
)

/**
 * Extracts $_colors map entries from the SCSS source.
 * Each entry is [key, oklchCss] e.g. ['black', 'oklch(25% 0 0deg)'] or ['black-20', 'oklch(25% 0 0deg / 20%)'].
 */
const extractColorsMapEntries = (source: string): [string, string][] => {
  const match = /\$_colors:\s*\(([\s\S]*?)\)\s*;/m.exec(source)
  const body = match?.[1]
  if (body === undefined) {
    return []
  }
  const entries: [string, string][] = []
  // Match lines like "  key: oklch(...)," or "  key: oklch(...)"
  const lineRe = /^\s*([\w-]+):\s*(oklch\([^)]+\))\s*,?\s*(?:\/\/.*)?$/gm
  let lineMatch: RegExpExecArray | null
  while ((lineMatch = lineRe.exec(body)) !== null) {
    const key = lineMatch[1]
    const oklchCss = lineMatch[2]
    if (typeof key === 'string' && typeof oklchCss === 'string') {
      entries.push([key, oklchCss.trim()])
    }
  }
  return entries
}

/**
 * Converts an oklch() CSS string to hex and optional opacity.
 * Returns { hex, opacity } where opacity is 1 for full opacity or 0–1 for alpha.
 */
const oklchToHexAndOpacity = (
  oklchCss: string
): {
  hex: string
  opacity: number
} => {
  const color: Color | undefined = parse(oklchCss)
  if (!color) {
    throw new Error(`Failed to parse color: ${oklchCss}`)
  }
  const hex = formatHex(color)
  const opacity = color.alpha !== undefined && color.alpha < 1 ? color.alpha : 1
  return { hex, opacity }
}

/**
 * Formats one color for Liquid: "handle--#hex" or "handle--#hex, opacity".
 */
const formatColorEntry = (
  handle: string,
  hex: string,
  opacity: number
): string => {
  if (opacity >= 1) {
    return `${handle}--${hex}`
  }
  const opacityStr = opacity.toFixed(2)
  return `${handle}--${hex}, ${opacityStr}`
}

export const codegenStyleGuideColorsTask: Task = {
  name: NAME,
  exec: async (): Promise<void> => {
    try {
      const source = await fs.readFile(COLORS_SCSS_PATH, 'utf-8')
      const entries = extractColorsMapEntries(source)
      if (entries.length === 0) {
        logger.warn('No $_colors entries found in {path}', {
          path: COLORS_SCSS_PATH
        })
        return
      }
      const parts: string[] = []
      for (const [handle, oklchCss] of entries) {
        const { hex, opacity } = oklchToHexAndOpacity(oklchCss)
        parts.push(formatColorEntry(handle, hex, opacity))
      }
      const colorsListStrings = parts.join('||')

      const sectionContent = await fs.readFile(SECTION_LIQUID_PATH, 'utf-8')
      const assignMark = "assign colors_list_strings = '"
      // Use lastIndexOf so we target the assign inside {% liquid %}, not the one in the comment above
      const startIdx = sectionContent.lastIndexOf(assignMark)
      if (startIdx === -1) {
        logger.warn(
          "Could not find assign colors_list_strings = ' in section.liquid; skipping write"
        )
        return
      }
      const valueStart = startIdx + assignMark.length
      const endIdx = sectionContent.indexOf("'", valueStart)
      if (endIdx === -1) {
        logger.warn(
          'Could not find closing quote for colors_list_strings in section.liquid; skipping write'
        )
        return
      }
      const newLine =
        sectionContent.slice(0, valueStart) +
        colorsListStrings +
        sectionContent.slice(endIdx)
      await fs.writeFile(SECTION_LIQUID_PATH, newLine)

      logger.info('Style guide colors data generated ({count} colors)', {
        count: entries.length
      })
    } catch (_err) {
      const err = logErrorDetails(_err)
      throw err
    }
  }
}

export const codegenStyleGuideColors = async (): Promise<void> => {
  await codegenStyleGuideColorsTask.exec()
}
