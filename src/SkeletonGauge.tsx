import { memo } from 'react'
import { angle, gaugeMax, polar } from './lib/gauge'
import { gearPath, gearPeriod } from './lib/watch'

const C = 150
type Unit = 'mph' | 'kmh'
const f = (n: number) => n.toFixed(2)

/** Regular polygon points (octagon bezel / hex screw heads). */
const poly = (cx: number, cy: number, r: number, n: number, rot = 0) =>
  Array.from({ length: n }, (_, i) => { const a = ((i * 360) / n + rot) * Math.PI / 180; return `${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}` }).join(' ')

/** Ring with evenodd hole, for wheel rims / annuli. */
const ring = (cx: number, cy: number, r: number) => `M${f(cx + r)},${cy} A${r},${r} 0 1 0 ${f(cx - r)},${cy} A${r},${r} 0 1 0 ${f(cx + r)},${cy}Z`

/** Openworked wheel: toothed rim, curved spokes, hub. Rotates via CSS (transform only). */
function Wheel({ cx, cy, r, teeth, spokes, ratio, ccw, gold }: { cx: number; cy: number; r: number; teeth: number; spokes: number; ratio: number; ccw?: boolean; gold?: boolean }) {
  const rim = r * 0.8, sw = Math.max(1, r * 0.07)
  const spokeD = Array.from({ length: spokes }, (_, i) => {
    const a0 = (i * 360) / spokes, [hx, hy] = polar(cx, cy, r * 0.2, a0), [mx, my] = polar(cx, cy, r * 0.55, a0 + 18), [ex, ey] = polar(cx, cy, rim, a0 + 34)
    return `M${f(hx)},${f(hy)} Q${f(mx)},${f(my)} ${f(ex)},${f(ey)}`
  }).join(' ')
  const cls = gold ? 'sk-wg' : 'sk-ws'
  return (
    <g className={`sk-wheel ${ccw ? 'ccw' : ''}`} style={{ transformOrigin: `${cx}px ${cy}px`, animationDuration: `calc(var(--p) * ${ratio})` }}>
      <path d={gearPath(cx, cy, r, teeth, Math.max(0.9, r * 0.055)) + ' ' + ring(cx, cy, rim)} fillRule="evenodd" className={cls} />
      <circle cx={cx} cy={cy} r={rim + 0.4} className="sk-wline" />
      <path d={spokeD} className={`${cls}-sp`} strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r * 0.24} className={cls} />
      <circle cx={cx} cy={cy} r={r * 0.24 - 0.8} className="sk-wline" />
    </g>
  )
}

/** Bridge: stroked organic curve with polished anglage (bright bevel either side of a darker brushed top). */
const Bridge = ({ d, w = 12, gold }: { d: string; w?: number; gold?: boolean }) => (
  <g className="sk-bridge">
    <path d={d} strokeWidth={w + 1.6} className="sk-br-shadow" />
    <path d={d} strokeWidth={w} stroke={gold ? 'url(#skPGBevel)' : 'url(#skBevel)'} />
    <path d={d} strokeWidth={w - 3} stroke={gold ? 'url(#skPG)' : 'url(#skRuth)'} />
    <path d={d} strokeWidth={0.5} className="sk-br-line" />
  </g>
)

const jewel = (x: number, y: number, k: string, s = 1) => (
  <g key={k}>
    <circle cx={x} cy={y} r={3.4 * s} fill="url(#skPG)" className="sk-chaton" />
    <circle cx={x} cy={y} r={2.8 * s} className="sk-chaton-in" />
    <circle cx={x} cy={y} r={2.1 * s} fill="url(#skRuby)" />
    <circle cx={x} cy={y} r={0.55 * s} fill="#2a0008" />
    <circle cx={x - 0.75 * s} cy={y - 0.8 * s} r={0.5 * s} fill="#fff" opacity=".9" />
  </g>
)
const screw = (x: number, y: number, a: number, k: string) => (
  <g key={k}>
    <circle cx={x} cy={y} r={3} className="sk-screw-sink" />
    <circle cx={x} cy={y} r={2.4} fill="url(#skBlue)" className="sk-screw" />
    <line x1={x - 2} y1={y} x2={x + 2} y2={y} transform={`rotate(${a} ${x} ${y})`} className="sk-slot" />
  </g>
)

// movement layout (viewBox units)
const BAL = { x: 100, y: 204, r: 29 }
const BARREL = { x: 206, y: 196, r: 31 }

/** Static case, movement and dial (memoised: never re-renders with speed; only the needle / readout / --p var change). */
const Movement = memo(function Movement({ unit }: { unit: Unit }) {
  const max = gaugeMax(unit)
  const fine: number[] = []; for (let v = 0; v <= max; v += 1) fine.push(v)
  const hair = `M${BAL.x + 2},${BAL.y} ${Array.from({ length: 360 }, (_, i) => { const t = (i / 359) * Math.PI * 2 * 10, r = 2.4 + i * 0.05; return `L${f(BAL.x + r * Math.cos(t))},${f(BAL.y + r * Math.sin(t))}` }).join(' ')}`
  return <>
    <defs>
      <linearGradient id="skCase" x1="0" y1="0" x2="1" y2="1"><stop offset="0" className="sk-c1" /><stop offset=".5" className="sk-c2" /><stop offset="1" className="sk-c3" /></linearGradient>
      {/* brushed satin bezel: fine repeating linear bands */}
      <linearGradient id="skSatin" x1="0" y1="0" x2="0" y2=".012" spreadMethod="repeat"><stop offset="0" stopColor="#fff" stopOpacity=".09" /><stop offset=".5" stopColor="#000" stopOpacity=".07" /><stop offset="1" stopColor="#fff" stopOpacity=".09" /></linearGradient>
      <linearGradient id="skBezel" x1=".1" y1="0" x2=".9" y2="1"><stop offset="0" className="sk-z1" /><stop offset=".35" className="sk-z2" /><stop offset=".62" className="sk-z3" /><stop offset="1" className="sk-z4" /></linearGradient>
      <linearGradient id="skChamfer" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".3" stopColor="#9da3ab" /><stop offset=".55" stopColor="#f4f6f8" /><stop offset=".8" stopColor="#6d727a" /><stop offset="1" stopColor="#e3e6ea" /></linearGradient>
      <radialGradient id="skHex" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#b9bec5" /><stop offset="1" stopColor="#5d6169" /></radialGradient>
      <radialGradient id="skDeep" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#1a1d22" /><stop offset=".8" stopColor="#0b0c0f" /><stop offset="1" stopColor="#030304" /></radialGradient>
      <pattern id="skPerlage" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#34383e" /><circle cx="2.5" cy="2.5" r="2.4" fill="url(#skPerl)" /><circle cx="0" cy="0" r="2.4" fill="url(#skPerl)" /><circle cx="5" cy="5" r="2.4" fill="url(#skPerl)" /></pattern>
      <radialGradient id="skPerl" cx="40%" cy="40%" r="60%"><stop offset="0" stopColor="#4d5259" /><stop offset=".7" stopColor="#383c42" /><stop offset="1" stopColor="#2f3237" /></radialGradient>
      <linearGradient id="skRuth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5a5f67" /><stop offset=".45" stopColor="#3c4047" /><stop offset=".55" stopColor="#4a4e56" /><stop offset="1" stopColor="#2c2f35" /></linearGradient>
      <linearGradient id="skBevel" x1="0" y1="0" x2="1" y2=".6"><stop offset="0" stopColor="#f2f4f7" /><stop offset=".35" stopColor="#8e949c" /><stop offset=".6" stopColor="#e6e9ed" /><stop offset="1" stopColor="#70757d" /></linearGradient>
      <linearGradient id="skPG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3c9ad" /><stop offset=".45" stopColor="#c98a6b" /><stop offset=".7" stopColor="#a8664a" /><stop offset="1" stopColor="#e2ad8f" /></linearGradient>
      <linearGradient id="skPGBevel" x1="0" y1="0" x2="1" y2=".6"><stop offset="0" stopColor="#fff0e4" /><stop offset=".4" stopColor="#b97a5c" /><stop offset=".65" stopColor="#ffe1cc" /><stop offset="1" stopColor="#8f543a" /></linearGradient>
      <radialGradient id="skRuby" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#ff9fb0" /><stop offset=".45" stopColor="#d01a3c" /><stop offset="1" stopColor="#5a0016" /></radialGradient>
      <radialGradient id="skBlue" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#9cc0ff" /><stop offset=".55" stopColor="#2349b8" /><stop offset="1" stopColor="#0a1745" /></radialGradient>
      <linearGradient id="skFlange" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5b6068" /><stop offset=".5" stopColor="#3a3e45" /><stop offset="1" stopColor="#4c5058" /></linearGradient>
      <radialGradient id="skSmoke" cx="50%" cy="40%" r="60%"><stop offset="0" stopColor="#0d1016" stopOpacity=".9" /><stop offset="1" stopColor="#050608" stopOpacity=".95" /></radialGradient>
      <filter id="skShadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="2.2" stdDeviation="1.8" floodColor="#000" floodOpacity=".75" /></filter>
    </defs>

    {/* case, gasket, octagonal bezel */}
    <circle cx={C} cy={C} r={149} fill="url(#skCase)" className="sk-case" />
    <circle cx={C} cy={C} r={149} fill="url(#skSatin)" />
    <polygon points={poly(C, C, 148.4, 8, 22.5)} strokeLinejoin="round" className="sk-gasket" />
    <polygon points={poly(C, C, 146, 8, 22.5)} fill="url(#skChamfer)" strokeLinejoin="round" className="sk-oct-edge" />
    <polygon points={poly(C, C, 142.6, 8, 22.5)} fill="url(#skBezel)" strokeLinejoin="round" />
    <polygon points={poly(C, C, 142.6, 8, 22.5)} fill="url(#skSatin)" />
    <circle cx={C} cy={C} r={125.5} fill="url(#skChamfer)" />
    <circle cx={C} cy={C} r={122.6} className="sk-inner-gasket" />
    {Array.from({ length: 8 }, (_, i) => {
      const [x, y] = polar(C, C, 134.5, i * 45 + 22.5)
      return <g key={i}><circle cx={x} cy={y + 0.6} r={4.9} fill="#00000055" /><polygon points={poly(x, y, 4.6, 6, i * 13)} fill="url(#skHex)" stroke="#4a4e55" strokeWidth=".35" /><polygon points={poly(x, y, 2.6, 6, i * 13)} fill="none" stroke="#ffffff" strokeOpacity=".55" strokeWidth=".35" /></g>
    })}

    {/* movement: deep openwork, mainplate segments with perlage */}
    <circle cx={C} cy={C} r={121.5} fill="url(#skDeep)" />
    <path d={ring(C, C, 106) + ' ' + ring(C, C, 97)} fillRule="evenodd" fill="url(#skPerlage)" opacity=".85" />
    <path d={`M${BARREL.x - 40},${BARREL.y + 30} Q${C},${C + 44} ${BAL.x + 34},${BAL.y + 30} L${C},262 Z`} fill="url(#skPerlage)" opacity=".55" />
    <path d={`M88,86 Q${C},40 212,86 Q${C},70 88,86Z`} fill="url(#skPerlage)" opacity=".5" />
    <circle cx={C} cy={C} r={121.5} className="sk-depth" />

    <g className="sk-train">
      {/* barrel with visible mainspring */}
      <g className="sk-wheel" style={{ transformOrigin: `${BARREL.x}px ${BARREL.y}px`, animationDuration: 'calc(var(--p) * 7)' }}>
        <path d={gearPath(BARREL.x, BARREL.y, BARREL.r, 84, 1.4) + ' ' + ring(BARREL.x, BARREL.y, BARREL.r - 4)} fillRule="evenodd" className="sk-ws" />
        <path d={`M${BARREL.x + 6},${BARREL.y} ${Array.from({ length: 70 }, (_, i) => { const t = (i / 69) * Math.PI * 2 * 6, r = 6 + i * 0.31; return `L${f(BARREL.x + r * Math.cos(t))},${f(BARREL.y + r * Math.sin(t))}` }).join(' ')}`} className="sk-mainspring" />
      </g>
      <Wheel cx={C} cy={C} r={47} teeth={96} spokes={6} ratio={1} />
      <Wheel cx={98} cy={104} r={22} teeth={60} spokes={5} ratio={0.42} ccw />
      <Wheel cx={202} cy={102} r={21} teeth={56} spokes={5} ratio={0.38} gold />
      <Wheel cx={150} cy={90} r={15} teeth={44} spokes={4} ratio={0.3} ccw />
      <Wheel cx={150} cy={232} r={13} teeth={20} spokes={4} ratio={0.18} ccw gold />
    </g>

    {/* balance wheel + blue hairspring (oscillates) */}
    <path d={hair} className="sk-hair" />
    <g className="sk-balance" style={{ transformOrigin: `${BAL.x}px ${BAL.y}px` }}>
      <path d={ring(BAL.x, BAL.y, BAL.r) + ' ' + ring(BAL.x, BAL.y, BAL.r - 3.2)} fillRule="evenodd" fill="url(#skPG)" stroke="#5b3020" strokeWidth=".3" />
      <path d={`M${BAL.x - BAL.r + 2},${BAL.y} L${BAL.x + BAL.r - 2},${BAL.y}`} stroke="url(#skPG)" strokeWidth="2.2" />
      {[30, 150, 210, 330].map((a) => { const [x, y] = polar(BAL.x, BAL.y, BAL.r - 5, a); return <g key={a}><circle cx={x} cy={y} r={2.1} fill="url(#skPGBevel)" stroke="#5b3020" strokeWidth=".3" /><line x1={x - 1.5} y1={y} x2={x + 1.5} y2={y} stroke="#5b3020" strokeWidth=".5" /></g> })}
    </g>

    {/* bridges with anglage, drop shadow for depth */}
    <g filter="url(#skShadow)">
      <Bridge d="M60,136 C74,62 226,62 240,136" w={13} />
      <Bridge d="M72,92 Q88,96 98,104 Q112,116 124,128" w={9} />
      <Bridge d="M228,90 Q214,94 202,102 Q186,114 176,128" w={9} />
      <Bridge d={`M240,168 Q${BARREL.x + 6},${BARREL.y + 4} 180,236`} w={12} />
      <Bridge d={`M62,172 Q${BAL.x + 4},${BAL.y - 6} 132,246`} w={11} gold />
    </g>
    {[screw(64, 132, 30, 's1'), screw(236, 132, 120, 's2'), screw(238, 170, 70, 's3'), screw(182, 234, 10, 's4'), screw(64, 174, 45, 's7'), screw(130, 244, 100, 's8'), screw(150, 74, 0, 's9')]}
    {[jewel(98, 104, 'j1'), jewel(202, 102, 'j2'), jewel(150, 232, 'j3'), jewel(BARREL.x, BARREL.y, 'j4', 1.2), jewel(BAL.x, BAL.y, 'j5', 1.15), jewel(118, 90, 'j6', .8), jewel(182, 90, 'j7', .8)]}

    {/* inner flange / minute track */}
    <path d={ring(C, C, 122) + ' ' + ring(C, C, 107)} fillRule="evenodd" fill="url(#skFlange)" />
    <circle cx={C} cy={C} r={107} className="sk-flange-edge" />
    {fine.map((v) => {
      const d = angle(v, max), major = v % 10 === 0, half = v % 5 === 0
      const [x1, y1] = polar(C, C, 121, d), [x2, y2] = polar(C, C, major ? 115.5 : half ? 117 : 118.6, d)
      return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} className={major ? 'sk-tick major' : half ? 'sk-tick mid' : 'sk-tick'} />
    })}
    {fine.filter((v) => v % 20 === 0).map((v) => { const [x, y] = polar(C, C, 111.2, angle(v, max)); return <text key={v} x={x} y={y} className="sk-num" textAnchor="middle" dominantBaseline="central" transform={`rotate(${angle(v, max)} ${f(x)} ${f(y)})`}>{v}</text> })}
    {/* applied pink-gold baton indices with lume */}
    {fine.filter((v) => v % 20 === 0).map((v) => {
      const d = angle(v, max)
      return <g key={v} transform={`rotate(${d} ${C} ${C})`}>
        <rect x={C - 2.6} y={C - 104} width={5.2} height={16} rx={.6} fill="#000" opacity=".55" transform="translate(0 1.4)" />
        <rect x={C - 2.6} y={C - 104} width={5.2} height={16} rx={.6} fill="url(#skPGBevel)" />
        <rect x={C - 1.2} y={C - 102.4} width={2.4} height={12.8} rx={.4} className="sk-lume" />
      </g>
    })}

    {/* centre readout: smoked sapphire disc */}
    <circle cx={C} cy={C} r={40} fill="url(#skPG)" opacity=".9" />
    <circle cx={C} cy={C} r={38.8} fill="url(#skSmoke)" />
    <circle cx={C} cy={C} r={35.5} className="sk-read-ring" />
  </>
})

/** Crystal reflection (static). */
const Crystal = memo(function Crystal() {
  return <>
    <defs>
      <linearGradient id="skSheen" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset=".5" stopColor="#fff" stopOpacity=".03" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
    </defs>
    <path d={`M${C - 116},${C - 30} A121,121 0 0 1 ${C + 60},${C - 106} Q${C - 20},${C - 70} ${C - 116},${C - 30}Z`} fill="url(#skSheen)" pointerEvents="none" />
    <path d={`M${C + 98},${C + 66} A121,121 0 0 1 ${C + 40},${C + 113}`} fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="1.6" strokeLinecap="round" />
  </>
})

export function SkeletonGauge({ value, unit, waiting, mps }: { value: number; unit: Unit; waiting: boolean; mps: number }) {
  const max = gaugeMax(unit), deg = waiting ? -135 : angle(value, max), p = waiting ? 0 : gearPeriod(mps)
  return (
    <div className="gauge skeleton" data-testid="speed" data-style="skeleton">
      <svg viewBox="0 0 300 300" role="img" aria-label={`${waiting ? 'No GPS' : Math.round(value)} ${unit === 'mph' ? 'mph' : 'km/h'}`}
        className={p ? 'run' : 'idle'} style={{ ['--p' as string]: `${p || 60}s` }}>
        <Movement unit={unit} />
        <text x={C} y={C - 2} className="sk-read" textAnchor="middle" dominantBaseline="central">{waiting ? '--' : Math.round(value)}</text>
        <text x={C} y={C + 24} className="sk-unit" textAnchor="middle">{unit === 'mph' ? 'MPH' : 'KM/H'}</text>
        {/* Royal Oak-style baton hand with lume */}
        <g className="needle sk-needle" style={{ transform: `rotate(${deg}deg)` }}>
          <path d={`M${C - 2.6},${C - 42} L${C - 2.1},${C - 106} L${C},${C - 119} L${C + 2.1},${C - 106} L${C + 2.6},${C - 42} Z`} className="sk-hand-shadow" transform="translate(1.2 2)" />
          <path d={`M${C - 2.6},${C - 42} L${C - 2.1},${C - 106} L${C},${C - 119} L${C + 2.1},${C - 106} L${C + 2.6},${C - 42} Z`} fill="url(#skPGBevel)" className="sk-hand" />
          <path d={`M${C},${C - 42} L${C},${C - 118}`} className="sk-hand-ridge" />
          <path d={`M${C - 1},${C - 50} L${C - 0.8},${C - 104} L${C + 0.8},${C - 104} L${C + 1},${C - 50} Z`} className="sk-lume sk-hand-lume" />
        </g>
        <Crystal />
      </svg>
    </div>
  )
}
