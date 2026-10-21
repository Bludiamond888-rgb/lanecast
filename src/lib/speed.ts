export interface Fix { lat: number; lon: number; t: number; speed?: number | null; accuracy?: number }

export const MPS_TO_MPH = 2.2369362920544
export const MPS_TO_KMH = 3.6
export const M_PER_MI = 1609.344

/** Great-circle distance in metres. */
export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371008.8, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Speed in m/s: device-reported if valid, else derived from previous fix. Null if unknown. */
export function speedFrom(prev: Fix | null, cur: Fix): number | null {
  if (cur.speed != null && Number.isFinite(cur.speed) && cur.speed >= 0) return cur.speed
  if (!prev) return null
  const dt = (cur.t - prev.t) / 1000
  if (dt <= 0.2) return null
  const d = haversine(prev, cur)
  // ignore jitter smaller than the combined accuracy radius
  const noise = ((prev.accuracy ?? 0) + (cur.accuracy ?? 0)) / 4
  return d < noise ? 0 : d / dt
}

/** Exponential smoothing; snaps to 0 when stopped, rejects absurd values (>90 m/s ≈ 200 mph). */
export function smooth(prev: number | null, next: number, alpha = 0.35): number {
  if (!Number.isFinite(next) || next < 0 || next > 90) return prev ?? 0
  if (prev == null) return next
  const v = prev + alpha * (next - prev)
  return v < 0.3 ? 0 : v
}

export type Unit = 'mph' | 'kmh'
export const toUnit = (mps: number, u: Unit) => mps * (u === 'mph' ? MPS_TO_MPH : MPS_TO_KMH)
export const fromUnit = (v: number, u: Unit) => v / (u === 'mph' ? MPS_TO_MPH : MPS_TO_KMH)
export const distUnit = (m: number, u: Unit) => (u === 'mph' ? m / M_PER_MI : m / 1000)
