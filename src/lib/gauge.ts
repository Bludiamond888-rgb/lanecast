export const SWEEP = 270
export const gaugeMax = (unit: 'mph' | 'kmh' | string) => (unit === 'mph' ? 160 : 260)
/** Fraction 0..1 of the dial for a speed (clamped). */
export const frac = (v: number, max: number) => Math.min(1, Math.max(0, (Number.isFinite(v) ? v : 0) / max))
/** Angle in degrees clockwise from 12 o'clock; -135 at 0, +135 at max. */
export const angle = (v: number, max: number) => -SWEEP / 2 + frac(v, max) * SWEEP
export function ticks(max: number) {
  const out: { v: number; major: boolean }[] = []
  for (let v = 0; v <= max; v += 10) out.push({ v, major: v % 20 === 0 })
  return out
}
export const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const
}
