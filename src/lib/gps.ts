import type { Fix } from './speed'

export type GpsStatus = 'waiting' | 'ok' | 'denied' | 'unavailable' | 'insecure'
export interface GpsHandlers { fix: (f: Fix) => void; status: (s: GpsStatus, msg?: string) => void }

/** Starts real GPS (or the ?sim=1 simulator). Returns a stop function. */
export function startGps(h: GpsHandlers): () => void {
  const q = new URLSearchParams(location.search)
  if (q.has('sim')) return startSim(h, q)
  if (!window.isSecureContext) { h.status('insecure'); return () => {} }
  if (!('geolocation' in navigator)) { h.status('unavailable', 'This browser has no location support.'); return () => {} }
  h.status('waiting')
  const id = navigator.geolocation.watchPosition(
    (p) => { h.status('ok'); h.fix({ lat: p.coords.latitude, lon: p.coords.longitude, t: p.timestamp || Date.now(), speed: p.coords.speed, accuracy: p.coords.accuracy }) },
    (e) => h.status(e.code === e.PERMISSION_DENIED ? 'denied' : 'waiting', e.message),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
  )
  return () => navigator.geolocation.clearWatch(id)
}

/** Fake drive: ?sim=1 cycles 0→65 mph; ?sim=1&mph=72 holds a speed. Positions move north so derived speed also works. */
function startSim(h: GpsHandlers, q: URLSearchParams): () => void {
  const hold = q.get('mph') ? Number(q.get('mph')) / 2.23694 : null
  let lat = 37.7749, lon = -122.4194, t0 = Date.now(), last = t0
  h.status('waiting')
  const iv = setInterval(() => {
    const now = Date.now(), el = (now - t0) / 1000, dt = (now - last) / 1000; last = now
    const v = hold ?? Math.max(0, 29 * Math.sin(el / 12) * Math.min(1, el / 4) + 16)
    lat += (v * dt) / 111195; lon += Math.sin(el / 30) * 0.000002
    h.status('ok')
    h.fix({ lat, lon, t: now, speed: q.get('derive') ? null : v, accuracy: 4 + 2 * Math.abs(Math.sin(el)) })
  }, 500)
  return () => clearInterval(iv)
}
