export type Segment = { color: string; tokens: number }

export type Gauge = { percent: number; window: number; segments: Segment[] } | null

declare module 'claude-code' {
  interface PluginState {
    'session-usage': { gauge: Gauge }
  }
}
