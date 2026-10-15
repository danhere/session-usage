import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Gauge, Segment } from '../types'

const BAR_HEIGHT = 5

// The swatches and order the desktop's context menu draws; every other used category is its grey.
const SWATCHES: [string, string][] = [
  ['Messages', '#256dd0'],
  ['System tools', '#e85d2e'],
  ['MCP tools', '#1aa66f'],
  ['Memory files', '#ea9700'],
]
const OTHER = '#7e7c76'

const gauge = atom({ plugin: 'session-usage', key: 'gauge' } as const, null as Gauge)

export const colorFor = (percent: number) =>
  percent >= 90 ? 'error' : percent >= 80 ? 'warning' : 'success'

// Orders categories as the menu lists them and folds the greys into one segment.
export const segmentsOf = (categories: { name: string; tokens: number }[]): Segment[] => {
  const named = SWATCHES.flatMap(([name, color]) =>
    categories.filter(c => c.name === name && c.tokens > 0).map(c => ({ color, tokens: c.tokens })),
  )
  const other = categories
    .filter(c => !SWATCHES.some(([name]) => name === c.name))
    .reduce((sum, c) => sum + c.tokens, 0)

  return other > 0 ? [...named, { color: OTHER, tokens: other }] : named
}

// The menu's bar: a rounded track with each segment at its share of the window and a 1px gap after it,
// the last segment's end rounded where it meets the track.
export const barSvg = (segments: Segment[], window: number, width: number) => {
  const r = BAR_HEIGHT / 2
  let x = 0
  const rects = segments.map((s, i) => {
    const w = Math.max(1, (s.tokens / window) * width - 1)
    const rect = (width: number, rx = '') =>
      `<rect x="${x.toFixed(1)}" width="${width.toFixed(1)}" height="${BAR_HEIGHT}"${rx} fill="${s.color}"/>`
    const drawn =
      i === segments.length - 1 && w > r ? rect(w - r) + rect(w, ` rx="${r}"`) : rect(w)
    x += w + 1

    return drawn
  })

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${BAR_HEIGHT}" viewBox="0 0 ${width} ${BAR_HEIGHT}" preserveAspectRatio="none">` +
    `<style>.track{fill:#e9e9e7}@media (prefers-color-scheme: dark){.track{fill:#3b3b39}}</style>` +
    `<clipPath id="c"><rect width="${width}" height="${BAR_HEIGHT}" rx="${r}"/></clipPath>` +
    `<g clip-path="url(#c)"><rect class="track" width="${width}" height="${BAR_HEIGHT}"/>${rects.join('')}</g></svg>`
  )
}

const show = async ($: EngineInterface) => {
  const { context } = await $.session.usage({ breakdown: 'summary' })
  const used = (context.breakdown?.categories ?? []).filter(c => c.kind === 'used')

  await update($, gauge, () =>
    context.percent === undefined
      ? null
      : { percent: context.percent, window: context.window, segments: segmentsOf(used) },
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    // Clears the status line an earlier version pinned.
    $.ui.status(undefined)
    await show($)

    return result
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context')) {
      await show($)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const g = await read($, gauge)

    if (e.props.hasSurvey || g === null) {
      return next(e)
    }

    const label = `${g.percent}%`
    const elements = $.ui.resolve(e)
    const { Box, Text } = elements

    if (!('Svg' in elements)) {
      return <Text color={colorFor(g.percent)}>{label}</Text>
    }

    const { Svg } = elements
    // Pixels are estimated from the band's columns; the image is capped at its slot and stretches to fill it.
    const width = Math.max(100, (e.props.bodyColumns - label.length - 3) * 9)

    return (
      <Box flexDirection="row" alignItems="center" gap={1} paddingX={1}>
        <Text color={colorFor(g.percent)}>{label}</Text>
        <Box flexGrow={1}>
          <Svg source={barSvg(g.segments, g.window, width)} alt={`Context ${label} used`} height={BAR_HEIGHT} />
        </Box>
      </Box>
    )
  })
}
