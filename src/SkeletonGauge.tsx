import { memo } from 'react'
import { angle, gaugeMax, polar } from './lib/gauge'
import { gearPath, gearPeriod } from './lib/watch'

const C = 150
type Unit = 'mph' | 'kmh'

/** Static movement + dial (memoised: never re-renders with speed, only the needle / readout / --p var change). */
const Movement = memo(function Movement({ unit }: { unit: Unit }) {
  const max = gaugeMax(unit), step = unit === 'mph' ? 2 : 2
  const ticks: number[] = []; for (let v = 0; v <= max; v += step) ticks.push(v)
  const gear = (k: string, cx: number, cy: number, r: number, teeth: number, ratio: number, dir: 1 | -1, spokes = 5, cls = 'sk-gold') => (
    <g key={k} className={`sk-wheel ${dir < 0 ? 'ccw' : ''}`} style={{ transformOrigin: `${cx}px ${cy}px`, animationDuration: `calc(var(--p) * ${ratio})` }}>
      <path d={gearPath(cx, cy, r, teeth) + ` M${cx + r * 0.72},${cy} A${r * 0.72},${r * 0.72} 0 1 0 ${cx - r * 0.72},${cy} A${r * 0.72},${r * 0.72} 0 1 0 ${cx + r * 0.72},${cy}Z`} className={cls} fillRule="evenodd" />
      {Array.from({ length: spokes }, (_, i) => {
        const a = (i * 360) / spokes, [x, y] = polar(cx, cy, r * 0.74, a)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className={`${cls}-spoke`} strokeWidth={Math.max(1.6, r * 0.12)} />
      })}
      <circle cx={cx} cy={cy} r={Math.max(3.2, r * 0.2)} className={cls} />
    </g>
  )
  const jewel = (x: number, y: number, k: string) => <g key={k}><circle cx={x} cy={y} r={3.6} className="sk-chaton" /><circle cx={x} cy={y} r={2.3} fill="url(#skRuby)" /><circle cx={x - 0.7} cy={y - 0.8} r={0.6} fill="#fff" opacity=".85" /></g>
  const screw = (x: number, y: number, a: number, k: string) => <g key={k}><circle cx={x} cy={y} r={3.1} fill="url(#skBlue)" className="sk-screw" /><line x1={x - 2.4} y1={y} x2={x + 2.4} y2={y} transform={`rotate(${a} ${x} ${y})`} className="sk-slot" /></g>
  return <>
    <defs>
      <radialGradient id="skBrush" cx="50%" cy="50%" r="2.2%" spreadMethod="repeat"><stop offset="0" className="sk-b1" /><stop offset=".5" className="sk-b2" /><stop offset="1" className="sk-b1" /></radialGradient>
      <linearGradient id="skSteel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" className="sk-st1" /><stop offset=".45" className="sk-st2" /><stop offset=".55" className="sk-st3" /><stop offset="1" className="sk-st1" /></linearGradient>
      <linearGradient id="skGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7e3a3" /><stop offset=".4" stopColor="#d4ac54" /><stop offset=".7" stopColor="#a87a2a" /><stop offset="1" stopColor="#e8c676" /></linearGradient>
      <linearGradient id="skBridge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="sk-br1" /><stop offset="1" className="sk-br2" /></linearGradient>
      <radialGradient id="skRuby" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#ff8a9a" /><stop offset=".5" stopColor="#c8102e" /><stop offset="1" stopColor="#5e0010" /></radialGradient>
      <radialGradient id="skBlue" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#7fa7ff" /><stop offset=".6" stopColor="#1f3fa8" /><stop offset="1" stopColor="#0c1a4d" /></radialGradient>
      <linearGradient id="skSapphire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="sk-sa1" /><stop offset="1" className="sk-sa2" /></linearGradient>
      <linearGradient id="skGlint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".38" /><stop offset=".45" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <linearGradient id="skNeedle" x1="0" y1="0" x2="1" y2="0"><stop offset="0" className="sk-n1" /><stop offset=".5" className="sk-n2" /><stop offset="1" className="sk-n1" /></linearGradient>
    </defs>
    {/* case + bezel */}
    <circle cx={C} cy={C} r={146} fill="url(#skSteel)" className="sk-case" />
    <circle cx={C} cy={C} r={140.5} className="sk-recess" />
    {/* open-worked movement */}
    <circle cx={C} cy={C} r={122} fill="url(#skBrush)" className="sk-plate" />
    <circle cx={C} cy={C} r={122} className="sk-depth" />
    {[[C, C, 66], [90, 91, 24], [210, 92, 25], [207, 206, 21], [91, 207, 27], [C, 238, 28]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} className="sk-hole" />)}
    <g className="sk-train">
      {gear('barrel', 91, 207, 25, 54, 6, 1, 0, 'sk-gold')}
      {gear('center', C, C, 63, 80, 1, 1, 5)}
      {gear('third', 90, 91, 21, 28, 0.35, -1, 4, 'sk-steelw')}
      {gear('fourth', 210, 92, 22, 30, 0.37, -1, 4)}
      {gear('escape', 207, 206, 19, 15, 0.2, 1, 5, 'sk-steelw')}
    </g>
    {/* bridges */}
    <path d="M84,84 Q150,50 216,86 L212,98 Q150,66 88,96 Z" fill="url(#skBridge)" className="sk-bridge" />
    <path d="M84,214 Q84,192 110,186 L116,194 Q96,202 94,220 Z" fill="url(#skBridge)" className="sk-bridge" />
    <path d="M190,188 L214,200 Q214,212 204,216 L194,208 Z" fill="url(#skBridge)" className="sk-bridge" />
    {/* balance cock + balance wheel */}
    <g className="sk-balance" style={{ transformOrigin: `${C}px 238px` }}>
      <circle cx={C} cy={238} r={23} className="sk-bal-rim" />
      {[0, 90, 180, 270].map((a) => { const [x, y] = polar(C, 238, 22, a); return <line key={a} x1={C} y1={238} x2={x} y2={y} className="sk-bal-spoke" /> })}
      {Array.from({ length: 10 }, (_, i) => { const [x, y] = polar(C, 238, 23, i * 36 + 18); return <circle key={i} cx={x} cy={y} r={1.5} className="sk-gold" /> })}
    </g>
    <path d={`M${C},238 ${Array.from({ length: 40 }, (_, i) => { const t = i / 39 * Math.PI * 7, r = 3 + i * 0.36; return `L${(C + r * Math.cos(t)).toFixed(1)},${(238 + r * Math.sin(t)).toFixed(1)}` }).join(' ')}`} className="sk-hair" />
    <path d={`M${C - 9},268 L${C - 4},240 L${C + 4},240 L${C + 9},268 Z`} fill="url(#skBridge)" className="sk-bridge" />
    {[screw(122, 70, 30, 's1'), screw(180, 72, 120, 's2'), screw(87, 218, 70, 's3'), screw(196, 196, 10, 's4'), screw(C, 263, 90, 's5'), screw(112, 192, 150, 's6')]}
    {[jewel(90, 91, 'j1'), jewel(210, 92, 'j2'), jewel(207, 206, 'j3'), jewel(91, 207, 'j4'), jewel(C, 238, 'j5'), jewel(150, 74, 'j6')]}
    {/* chapter ring (minute track) */}
    <path d={`M${C},${C - 140} A140,140 0 1 1 ${C - 0.01},${C - 140} M${C},${C - 124} A124,124 0 1 0 ${C + 0.01},${C - 124}Z`} className="sk-ring" fillRule="evenodd" />
    <circle cx={C} cy={C} r={124} className="sk-ring-edge" />
    {ticks.map((v) => {
      const d = angle(v, max), major = v % 20 === 0, mid = v % 10 === 0
      const [x1, y1] = polar(C, C, 138, d), [x2, y2] = polar(C, C, major ? 126 : mid ? 131 : 134.5, d)
      return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} className={major ? 'sk-tick major' : mid ? 'sk-tick mid' : 'sk-tick'} />
    })}
    {ticks.filter((v) => v % 20 === 0).map((v) => { const [x, y] = polar(C, C, 112, angle(v, max)); return <text key={v} x={x} y={y} className="sk-num" textAnchor="middle" dominantBaseline="central">{v}</text> })}
  </>
})

export function SkeletonGauge({ value, unit, waiting, mps }: { value: number; unit: Unit; waiting: boolean; mps: number }) {
  const max = gaugeMax(unit), deg = waiting ? -135 : angle(value, max), p = waiting ? 0 : gearPeriod(mps)
  return (
    <div className="gauge skeleton" data-testid="speed" data-style="skeleton">
      <svg viewBox="0 0 300 300" role="img" aria-label={`${waiting ? 'No GPS' : Math.round(value)} ${unit === 'mph' ? 'mph' : 'km/h'}`}
        className={p ? 'run' : 'idle'} style={{ ['--p' as string]: `${p || 60}s` }}>
        <Movement unit={unit} />
        {/* sapphire window */}
        <rect x={C - 64} y={C - 36} width={128} height={78} rx={16} className="sk-win-frame" />
        <rect x={C - 60} y={C - 32} width={120} height={70} rx={13} fill="url(#skSapphire)" className="sk-win" />
        <text x={C} y={C - 3} className="sk-read" textAnchor="middle" dominantBaseline="central">{waiting ? '--' : Math.round(value)}</text>
        <text x={C} y={C + 31} className="sk-unit" textAnchor="middle">{unit === 'mph' ? 'MPH' : 'KM/H'}</text>
        <rect x={C - 60} y={C - 32} width={120} height={70} rx={13} fill="url(#skGlint)" pointerEvents="none" />
        {/* breguet needle */}
        <g className="needle sk-needle" style={{ transform: `rotate(${deg}deg)` }}>
          <path d={`M${C - 2.2},${C - 44} L${C - 1.3},${C - 92} L${C},${C - 136} L${C + 1.3},${C - 92} L${C + 2.2},${C - 44} Z`} fill="url(#skNeedle)" />
          <circle cx={C} cy={C - 98} r={6.2} className="sk-moon" />
          <circle cx={C} cy={C - 98} r={3.4} className="sk-moon-hole" />
        </g>
      </svg>
    </div>
  )
}
