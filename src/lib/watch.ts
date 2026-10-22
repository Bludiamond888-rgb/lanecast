/** Skeleton-watch gauge helpers (pure, testable). */
export type GaugeStyle = 'classic' | 'skeleton'
export const GAUGE_STYLES: GaugeStyle[] = ['classic', 'skeleton']
export const isGaugeStyle = (v: unknown): v is GaugeStyle => v === 'classic' || v === 'skeleton'

/**
 * Seconds per revolution of the main gear for a speed in m/s, or 0 when stopped.
 * Proportional to speed (period = K / v), quantised to 2 m/s buckets so the CSS
 * animation duration changes rarely (each change restarts nothing but avoids jitter).
 */
export function gearPeriod(mps: number): number {
  if (!Number.isFinite(mps) || mps < 0.5) return 0
  const v = Math.max(1, Math.round(mps / 2) * 2)
  return Math.round((240 / v) * 100) / 100 // 30 m/s (≈67 mph) → 8 s/rev; 2 m/s → 120 s/rev
}

/** SVG path for a toothed gear wheel centred at (cx,cy). */
export function gearPath(cx: number, cy: number, r: number, teeth: number, depth = Math.max(1.2, r * 0.12)): string {
  const pts: string[] = [], n = teeth * 4, ri = r - depth
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, rr = i % 4 < 2 ? r : ri
    // slight taper: tooth tips narrower than roots
    const off = (i % 4 === 0 ? 0.18 : i % 4 === 1 ? -0.18 : i % 4 === 2 ? 0.18 : -0.18) * (Math.PI * 2 / n)
    const aa = a + (i % 4 < 2 ? off : -off)
    pts.push(`${(cx + rr * Math.cos(aa)).toFixed(2)},${(cy + rr * Math.sin(aa)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}

const ROMAN: [number, string][] = [[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
export function roman(n: number): string {
  if (n <= 0) return '0'
  let s = ''
  for (const [v, r] of ROMAN) while (n >= v) { s += r; n -= v }
  return s
}
