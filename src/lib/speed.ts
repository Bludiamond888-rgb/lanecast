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
export const otherUnit = (u: Unit): Unit => (u === 'mph' ? 'kmh' : 'mph')
/** Convert a display value between mph and km/h. */
export const convertUnit = (v: number, from: Unit, to: Unit) => (from === to ? v : toUnit(fromUnit(v, from), to))

export const MAX_ACCURACY_M = 30
export const JUMP_MPS = 15 / MPS_TO_MPH // 15 mph
export const STOP_MPS = 1 / MPS_TO_MPH // 1 mph
export const MAX_ACCEL = 4 // m/s² cap for extrapolation (~0.4 g)
export const MAX_EXTRAP_S = 0.3

/**
 * Low-latency speed filter. Doppler coords.speed is used directly (light EMA);
 * position-derived speed is only a fallback. Inaccurate fixes are ignored (last good kept),
 * implausible derived jumps are discarded, and <1 mph for 2 fixes snaps to 0.
 */
export class SpeedFilter {
  value: number | null = null
  accel = 0
  lastGood: Fix | null = null
  lastT = 0
  lowCount = 0
  alpha: number
  constructor(alpha = 0.7) { this.alpha = alpha }

  /** Returns true if the fix was used for speed. */
  update(f: Fix): boolean {
    if (f.accuracy != null && f.accuracy > MAX_ACCURACY_M) return false
    const doppler = f.speed != null && Number.isFinite(f.speed) && f.speed >= 0
    let raw: number | null
    if (doppler) raw = f.speed as number
    else {
      raw = speedFrom(this.lastGood, { ...f, speed: null })
      if (raw != null && this.value != null && this.lastGood && (f.t - this.lastGood.t) < 500 && Math.abs(raw - this.value) > JUMP_MPS) return false
    }
    if (raw == null) { this.lastGood = f; return false }
    if (raw > 90) return false
    const prevV = this.value, prevT = this.lastT
    let v = prevV == null ? raw : doppler ? prevV + this.alpha * (raw - prevV) : prevV + 0.5 * (raw - prevV)
    this.lowCount = raw < STOP_MPS ? this.lowCount + 1 : 0
    if (this.lowCount >= 2) v = 0
    const dt = (f.t - prevT) / 1000
    this.accel = prevV != null && dt > 0.2 && dt < 3 && v > 0 ? Math.max(-MAX_ACCEL, Math.min(MAX_ACCEL, (v - prevV) / dt)) : 0
    this.value = v; this.lastT = f.t; this.lastGood = f
    return true
  }

  /** Speed at time `now` (ms), lightly extrapolated with capped acceleration; never negative. */
  predict(now: number): number {
    if (this.value == null) return 0
    if (this.value === 0) return 0
    const el = Math.max(0, Math.min(MAX_EXTRAP_S, (now - this.lastT) / 1000))
    return Math.max(0, this.value + this.accel * el)
  }
}

export type SignalLevel = 'good' | 'weak' | 'lost'
export function signalLevel(lastFixT: number | null, accuracy: number | null, now: number): SignalLevel {
  if (lastFixT == null || now - lastFixT > 3000) return 'lost'
  return accuracy != null && accuracy <= 20 ? 'good' : 'weak'
}

/** Apply calibration offset (given in mph) to a displayed value in unit `u`. Zero stays zero. */
export function calibrate(shown: number, offsetMph: number, u: Unit): number {
  if (shown <= 0) return 0
  return Math.max(0, shown + (u === 'mph' ? offsetMph : offsetMph * 1.609344))
}
