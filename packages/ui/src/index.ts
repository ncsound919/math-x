/**
 * @mathx/ui — shared design system tokens and base components.
 *
 * Components graduate here from apps/web/src/components/ once they are
 * stable and needed by more than one app.
 *
 * Currently exported: design tokens only.
 * Next candidates: Badge, Spinner, StatusDot (used in App.tsx header).
 */

// ---------------------------------------------------------------------------
// Design tokens — single source of truth for the Math X colour palette.
// Import these in components instead of hardcoding hex strings.
// ---------------------------------------------------------------------------
export const colors = {
  gold:       '#f0a500',
  goldDim:    '#8a5e00',
  teal:       '#00e5b0',
  purple:     '#e05aff',
  blue:       '#00c8ff',
  orange:     '#ff6b35',
  green:      '#7cff6b',
  bg:         '#060400',
  bg1:        '#0a0800',
  bg2:        '#0e0c07',
  bg3:        '#141008',
  border:     '#2a2010',
  text:       '#c8bfa8',
  textDim:    '#6a5a3a',
} as const

export type ColorKey = keyof typeof colors

// ---------------------------------------------------------------------------
// Mode colour map — single source of truth for per-mode accent colours.
// Keeps App.tsx MODES array and any other consumers in sync.
// ---------------------------------------------------------------------------
export const modeColors: Record<string, string> = {
  scientist:   colors.gold,
  formula:     colors.teal,
  hypothesis:  colors.purple,
  solve:       colors.blue,
  'deep-solve': colors.blue,
  synergy:     colors.orange,
  probability: colors.purple,
  files:       colors.green,
  'file-intel': colors.green,
  domain:      colors.purple,
}

// ---------------------------------------------------------------------------
// Typography tokens
// ---------------------------------------------------------------------------
export const fonts = {
  mono:  "'JetBrains Mono', 'DM Mono', monospace",
  serif: "'Libre Baskerville', serif",
  body:  "'DM Mono', 'JetBrains Mono', monospace",
} as const

// ---------------------------------------------------------------------------
// Spacing scale (px)
// ---------------------------------------------------------------------------
export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
} as const
