import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { smooth, speedFrom, toUnit, fromUnit, distUnit, type Fix } from './lib/speed'
import { startGps, type GpsStatus } from './lib/gps'
import { addFix, avgMoving, finish, fmtDuration, newTrip, type Trip, type TripState } from './lib/trip'
import { loadSettings, saveSettings, loadTrips, saveTrips, type Settings } from './lib/store'

type Route = 'drive' | 'trips' | 'settings'
const getRoute = (): Route => { const r = location.hash.replace('#/', ''); return r === 'trips' || r === 'settings' ? r : 'drive' }
const subHash = (cb: () => void) => { addEventListener('hashchange', cb); return () => removeEventListener('hashchange', cb) }
const darkMq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
const subDark = (cb: () => void) => { darkMq?.addEventListener('change', cb); return () => darkMq?.removeEventListener('change', cb) }

const landMq = typeof matchMedia === 'function' ? matchMedia('(orientation: landscape)') : null
const subLand = (cb: () => void) => { landMq?.addEventListener('change', cb); return () => landMq?.removeEventListener('change', cb) }

function useClock() { const [n, setN] = useState(Date.now()); useEffect(() => { const i = setInterval(() => setN(Date.now()), 1000); return () => clearInterval(i) }, []); return n }

function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null, dead = false
    const get = () => navigator.wakeLock.request('screen').then((l) => { if (dead) l.release(); else lock = l }).catch(() => {})
    const vis = () => { if (document.visibilityState === 'visible') get() }
    get(); document.addEventListener('visibilitychange', vis)
    return () => { dead = true; lock?.release().catch(() => {}); document.removeEventListener('visibilitychange', vis) }
  }, [on])
}

let audio: AudioContext | null = null
function beep() {
  try {
    audio ??= new AudioContext()
    const o = audio.createOscillator(), g = audio.createGain()
    o.frequency.value = 880; g.gain.setValueAtTime(0.15, audio.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.25)
    o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.25)
  } catch { /* no audio */ }
}

export default function App() {
  const route = useSyncExternalStore(subHash, getRoute)
  const sysDark = useSyncExternalStore(subDark, () => !!darkMq?.matches)
  const [settings, setSettingsRaw] = useState<Settings>(loadSettings)
  const setSettings = (s: Settings) => { setSettingsRaw(s); saveSettings(s) }
  const [trips, setTripsRaw] = useState<Trip[]>(loadTrips)
  const setTrips = (t: Trip[]) => { setTripsRaw(t); saveTrips(t) }

  const [status, setStatus] = useState<GpsStatus>('waiting')
  const [errMsg, setErrMsg] = useState<string>()
  const [speed, setSpeed] = useState(0) // m/s smoothed
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [hasFix, setHasFix] = useState(false)
  const [trip, setTrip] = useState<TripState | null>(null)
  const prev = useRef<Fix | null>(null), sm = useRef<number | null>(null), tripRef = useRef<TripState | null>(null)
  const [gpsKey, setGpsKey] = useState(0)

  useEffect(() => startGps({
    status: (s, m) => { setStatus(s); setErrMsg(m) },
    fix: (f) => {
      const raw = speedFrom(prev.current, f); prev.current = f
      if (raw != null) sm.current = smooth(sm.current, raw)
      const v = sm.current ?? 0
      setSpeed(v); setAccuracy(f.accuracy ?? null); setHasFix(true)
      if (tripRef.current) { tripRef.current = addFix(tripRef.current, f, v); setTrip(tripRef.current) }
    },
  }), [gpsKey])

  useWakeLock(!!trip)
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && sysDark)
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }, [dark])

  const shown = toUnit(speed, settings.unit)
  const over = settings.limitOn && settings.limit > 0 && shown > settings.limit + 0.5
  const wasOver = useRef(false)
  useEffect(() => { if (over && !wasOver.current && settings.beep) beep(); wasOver.current = over }, [over, settings.beep])

  const toggleTrip = () => {
    if (tripRef.current) {
      const t = finish(tripRef.current, Date.now())
      if (t.distance > 0 || t.end - t.start > 5000) setTrips([t, ...trips])
      tripRef.current = null; setTrip(null)
    } else { tripRef.current = newTrip(Date.now()); setTrip(tripRef.current) }
    if (settings.beep) audio?.resume()
  }

  return (
    <div className={`app r-${route}`}>
      {route === 'drive' && <Drive {...{ settings, status, errMsg, speed, shown, accuracy, hasFix, trip, over, toggleTrip, retry: () => setGpsKey(gpsKey + 1) }} />}
      {route === 'trips' && <Trips trips={trips} unit={settings.unit} onDelete={(id) => setTrips(trips.filter((t) => t.id !== id))} />}
      {route === 'settings' && <SettingsView s={settings} set={setSettings} />}
      <nav className="nav">
        {(['drive', 'trips', 'settings'] as Route[]).map((r) => (
          <a key={r} href={`#/${r}`} className={route === r ? 'on' : ''}>{r[0].toUpperCase() + r.slice(1)}</a>
        ))}
      </nav>
    </div>
  )
}

function Signal({ status, accuracy }: { status: GpsStatus; accuracy: number | null }) {
  const bars = status !== 'ok' || accuracy == null ? 0 : accuracy <= 10 ? 4 : accuracy <= 25 ? 3 : accuracy <= 60 ? 2 : 1
  return (
    <span className="signal" data-testid="signal" title={accuracy != null ? `±${Math.round(accuracy)} m` : 'No GPS'}>
      <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden>{[0, 1, 2, 3].map((i) => <rect key={i} x={i * 5} y={10 - i * 3.3} width="3" height={4 + i * 3.3} rx="1" className={i < bars ? 'b on' : 'b'} />)}</svg>
      GPS{accuracy != null && status === 'ok' ? ` ±${Math.round(accuracy)}m` : ''}
    </span>
  )
}

function Drive(p: { settings: Settings; status: GpsStatus; errMsg?: string; speed: number; shown: number; accuracy: number | null; hasFix: boolean; trip: TripState | null; over: boolean; toggleTrip: () => void; retry: () => void }) {
  const now = useClock(), u = p.settings.unit, du = u === 'mph' ? 'mi' : 'km'
  const t = p.trip
  const elapsed = t ? now - t.start : 0
  const waiting = !p.hasFix && (p.status === 'waiting' || p.status === 'ok')
  return (
    <main className={`drive ${p.over ? 'over' : ''}`}>
      <section className="panel">
        <div className="status">
          <span className="clock">{new Date(now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
          <Signal status={p.status} accuracy={p.accuracy} />
          <span className="tripd">{t ? `${distUnit(t.distance, u).toFixed(1)} ${du}` : '—'}</span>
        </div>
        <div className="speedrow">
          <div className="gears" aria-hidden>{'PRND'.split('').map((g) => <span key={g} className={g === 'D' ? 'on' : ''}>{g}</span>)}</div>
          <div className="speed" data-testid="speed">
            <div className="num">{waiting ? '--' : Math.round(p.shown)}</div>
            <div className="unit">{u === 'mph' ? 'MPH' : 'KM/H'}</div>
          </div>
          {p.settings.limitOn && (
            <div className="limit" data-testid="limit" aria-label={`Alert at ${p.settings.limit}`}>
              <small>SPEED<br />LIMIT</small><b>{p.settings.limit}</b>
            </div>
          )}
        </div>
        {waiting && <div className="note pulse">Waiting for GPS…</div>}
        {p.status === 'denied' && (
          <div className="note err" data-testid="denied">
            <b>Location access is off.</b>
            <p>iPhone: Settings › Privacy &amp; Security › Location Services › Safari Websites → “While Using the App” and turn on Precise Location. Then reload.</p>
            <button className="btn ghost" onClick={p.retry}>Try again</button>
          </div>
        )}
        {p.status === 'insecure' && <div className="note err"><b>HTTPS required.</b><p>GPS only works when this page is served over https://.</p></div>}
        {p.status === 'unavailable' && <div className="note err">{p.errMsg}</div>}
        <div className="stats">
          <Stat k="Time" v={fmtDuration(elapsed)} />
          <Stat k="Distance" v={t ? distUnit(t.distance, u).toFixed(2) : '0.00'} s={du} />
          <Stat k="Top" v={t ? Math.round(toUnit(t.top, u)).toString() : '0'} s={u === 'mph' ? 'mph' : 'km/h'} />
          <Stat k="Avg" v={t ? Math.round(toUnit(avgMoving(t), u)).toString() : '0'} s={u === 'mph' ? 'mph' : 'km/h'} />
        </div>
        <button className={`btn trip ${t ? 'stop' : ''}`} onClick={p.toggleTrip} data-testid="trip-btn">{t ? 'End Trip' : 'Start Trip'}</button>
      </section>
      <Road mps={p.speed} />
    </main>
  )
}

const Stat = ({ k, v, s }: { k: string; v: string; s?: string }) => <div className="stat"><span>{k}</span><b>{v}{s && <i> {s}</i>}</b></div>

/** Perspective road with lane dashes that scroll proportionally to speed; top-down car silhouette. */
function Road({ mps }: { mps: number }) {
  const g = useRef<SVGGElement>(null), v = useRef(mps)
  const land = useSyncExternalStore(subLand, () => !!landMq?.matches)
  v.current = mps
  useEffect(() => {
    let off = 0, last = performance.now(), raf = 0
    const tick = (n: number) => {
      off = (off + v.current * 14 * ((n - last) / 1000)) % 120; last = n
      g.current?.style.setProperty('--off', String(-off))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [])
  // lanes converge to vanishing point (200,0)
  const lane = (xb: number) => `M${200 + (xb - 200) * 0.18},0 L${xb},800`
  return (
    <section className="road" aria-hidden>
      <svg viewBox="0 0 400 800" preserveAspectRatio={land ? "xMidYMax meet" : "xMidYMax slice"}>
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="rg0" /><stop offset="1" className="rg1" /></linearGradient>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".35" stopColor="#fff" stopOpacity="1" /></linearGradient>
          <mask id="m"><rect width="400" height="800" fill="url(#fade)" /></mask>
          <radialGradient id="shadow"><stop offset="0" stopColor="#000" stopOpacity=".28" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
        </defs>
        <g mask="url(#m)">
          <path d="M182,0 L218,0 L470,800 L-70,800 Z" fill="url(#rg)" />
          <path d={lane(-70)} className="edge" /><path d={lane(470)} className="edge" />
          <g ref={g} className="dashes">
            <path d={lane(110)} pathLength="1200" /><path d={lane(290)} pathLength="1200" />
          </g>
        </g>
        <g transform="translate(200 640)">
          <ellipse cx="0" cy="8" rx="70" ry="120" fill="url(#shadow)" />
          <path className="car" d="M-44,-92 C-44,-112 -26,-118 0,-118 C26,-118 44,-112 44,-92 L48,-30 L48,80 C48,104 30,112 0,112 C-30,112 -48,104 -48,80 L-48,-30 Z" />
          <path className="glass" d="M-36,-46 C-20,-56 20,-56 36,-46 L32,-10 C12,-16 -12,-16 -32,-10 Z" />
          <path className="glass" d="M-32,10 C-12,6 12,6 32,10 L34,58 C12,66 -12,66 -34,58 Z" opacity=".55" />
          <path className="glass" d="M-30,72 C-12,78 12,78 30,72 L28,90 C10,96 -10,96 -28,90 Z" />
          <rect x="-54" y="-38" width="8" height="12" rx="3" className="mirror" /><rect x="46" y="-38" width="8" height="12" rx="3" className="mirror" />
        </g>
      </svg>
    </section>
  )
}

function Trips({ trips, unit, onDelete }: { trips: Trip[]; unit: Settings['unit']; onDelete: (id: string) => void }) {
  const du = unit === 'mph' ? 'mi' : 'km', su = unit === 'mph' ? 'mph' : 'km/h'
  return (
    <main className="page">
      <h1>Trips</h1>
      {!trips.length && <p className="muted">No trips yet. Tap <b>Start Trip</b> on the Drive screen.</p>}
      <ul className="list">
        {trips.map((t) => (
          <li key={t.id} className="card" data-testid="trip-row">
            <div className="when">
              <b>{new Date(t.start).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</b>
              <span>{new Date(t.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {fmtDuration(t.end - t.start)}</span>
            </div>
            <div className="nums">
              <Stat k="Distance" v={distUnit(t.distance, unit).toFixed(1)} s={du} />
              <Stat k="Top" v={Math.round(toUnit(t.top, unit)).toString()} s={su} />
              <Stat k="Avg" v={Math.round(toUnit(avgMoving(t), unit)).toString()} s={su} />
            </div>
            <button className="del" aria-label="Delete trip" onClick={() => confirm('Delete this trip?') && onDelete(t.id)}>✕</button>
          </li>
        ))}
      </ul>
    </main>
  )
}

function Seg<T extends string>({ value, opts, set }: { value: T; opts: [T, string][]; set: (v: T) => void }) {
  return <div className="seg">{opts.map(([v, l]) => <button key={v} className={v === value ? 'on' : ''} onClick={() => set(v)}>{l}</button>)}</div>
}
const Toggle = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) =>
  <button role="switch" aria-checked={on} aria-label={label} className={`tog ${on ? 'on' : ''}`} onClick={() => set(!on)}><i /></button>

function SettingsView({ s, set }: { s: Settings; set: (s: Settings) => void }) {
  const changeUnit = (unit: Settings['unit']) => {
    if (unit === s.unit) return
    set({ ...s, unit, limit: Math.round(toUnit(fromUnit(s.limit, s.unit), unit) / 5) * 5 })
  }
  return (
    <main className="page">
      <h1>Settings</h1>
      <div className="card rows">
        <div className="row"><span>Units</span><Seg value={s.unit} set={changeUnit} opts={[['mph', 'MPH'], ['kmh', 'km/h']]} /></div>
        <div className="row"><span>Appearance</span><Seg value={s.theme} set={(theme) => set({ ...s, theme })} opts={[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]} /></div>
      </div>
      <div className="card rows">
        <div className="row"><span>Speed alert</span><Toggle label="Speed alert" on={s.limitOn} set={(limitOn) => set({ ...s, limitOn })} /></div>
        <div className="row">
          <span>Alert above</span>
          <div className="stepper">
            <button aria-label="minus" onClick={() => set({ ...s, limit: Math.max(5, s.limit - 5) })}>−</button>
            <b data-testid="limit-val">{s.limit}<i> {s.unit === 'mph' ? 'mph' : 'km/h'}</i></b>
            <button aria-label="plus" onClick={() => set({ ...s, limit: Math.min(200, s.limit + 5) })}>+</button>
          </div>
        </div>
        <div className="row"><span>Beep when over</span><Toggle label="Beep" on={s.beep} set={(beep) => set({ ...s, beep })} /></div>
      </div>
      <p className="muted small">GPS speed is an estimate — always trust your vehicle's speedometer. Screen stays awake during trips where supported. Trips are stored only on this device.</p>
    </main>
  )
}
