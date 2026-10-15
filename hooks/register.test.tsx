import { expect, test } from 'claude-code/testing'

import { barSvg, colorFor, segmentsOf } from './register'

test('goes green, then orange at 80%, then red at 90%', () => {
  expect([79, 80, 89, 90].map(colorFor)).toEqual(['success', 'warning', 'warning', 'error'])
})

test('orders categories as the menu does and folds the greys', () => {
  expect(
    segmentsOf([
      { name: 'System prompt', tokens: 9500 },
      { name: 'System tools', tokens: 18400 },
      { name: 'Skills', tokens: 7600 },
      { name: 'Messages', tokens: 74600 },
      { name: 'Memory files', tokens: 0 },
    ]),
  ).toEqual([
    { color: '#256dd0', tokens: 74600 },
    { color: '#e85d2e', tokens: 18400 },
    { color: '#7e7c76', tokens: 17100 },
  ])
})

test('sizes each segment by its share of the window, as the menu does, rounding the last one', () => {
  const svg = barSvg([{ color: '#256dd0', tokens: 75000 }, { color: '#e85d2e', tokens: 18000 }], 1000000, 334)

  expect(svg).toContain('<rect x="0.0" width="24.1" height="5" fill="#256dd0"/>')
  expect(svg).toContain('<rect x="25.1" width="2.5" height="5" fill="#e85d2e"/><rect x="25.1" width="5.0" height="5" rx="2.5" fill="#e85d2e"/>')
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`draws a valid band on ${surface}`, async ($, on) => {
    on('session.measure', ($, e) => ({ changed: e.changed }))
    on('session.usage', () => ({
      value: {
        startedAt: 0,
        context: {
          tokens: 138800,
          window: 1000000,
          percent: 14,
          breakdown: { categories: [{ name: 'Messages', tokens: 74600, color: 'promptBorder', isDeferred: false, kind: 'used' }] },
        },
      },
    }) as never)
    await $.session.measure({
      context: { tokens: 138800, window: 1000000, percent: 14 },
      rateLimits: [],
      changed: ['context'],
    })

    const tree = JSON.stringify(
      await $.ui.render({
        surface,
        component: 'AbovePrompt',
        requestId: 'band',
        props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 60, scroll: { offset: 0, bodyRows: 9 }, view: {} },
      } as never),
    )

    expect(tree).toContain('14%')
    if (surface === 'desktop') {
      expect(tree).toContain('#256dd0')
    }
  })
}
