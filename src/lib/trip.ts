import { haversine, type Fix } from './speed'

export interface TripState {
  start: number; end?: number
  distance: number   // m
  top: number        // m/s
  movingMs: number   // time spent above MOVING threshold
  last: Fix | null
}
export interface Trip { id: string; start: number; end: number; distance: number; top: number; movingMs: number }

export const MOVING = 0.8 // m/s (~1.8 mph)

export const newTrip = (t: number): TripState => ({ start: t, distance: 0, top: 0, movingMs: 0, last: null })

/** Fold a fix + its smoothed speed into the trip. Distance only counts while moving & accurate. */
export function addFix(s: TripState, f: Fix, speed: number): TripState {
  const n = { ...s, top: Math.max(s.top, speed), last: f }
  if (s.last && speed >= MOVING && (f.accuracy ?? 0) < 60) {
    const dt = f.t - s.last.t
    if (dt > 0 && dt < 30000) { n.distance += haversine(s.last, f); n.movingMs += dt }
  }
  return n
}

export const avgMoving = (s: { distance: number; movingMs: number }) => (s.movingMs > 0 ? s.distance / (s.movingMs / 1000) : 0)

export function finish(s: TripState, t: number): Trip {
  return { id: String(s.start), start: s.start, end: t, distance: s.distance, top: s.top, movingMs: s.movingMs }
}

export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const p = (x: number) => String(x).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`
}
