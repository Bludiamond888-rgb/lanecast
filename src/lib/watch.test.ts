import { beforeEach, describe, expect, it } from 'vitest'
import { gearPath, gearPeriod, isGaugeStyle, roman } from './watch'
import { DEFAULTS, loadSettings, saveSettings } from './store'

const mem = new Map<string, string>()
beforeEach(() => {
  mem.clear()
  ;(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) }
})

describe('gauge style setting', () => {
  it('defaults to classic', () => { expect(DEFAULTS.gaugeStyle).toBe('classic'); expect(loadSettings().gaugeStyle).toBe('classic') })
  it('old saved settings without the field get classic', () => {
    mem.set('lanecast.settings', JSON.stringify({ unit: 'kmh', limit: 100, limitOn: true, beep: false, theme: 'dark', calib: 0 }))
    const s = loadSettings(); expect(s.gaugeStyle).toBe('classic'); expect(s.unit).toBe('kmh')
  })
  it('persists skeleton in localStorage', () => {
    saveSettings({ ...DEFAULTS, gaugeStyle: 'skeleton' })
    expect(JSON.parse(mem.get('lanecast.settings')!).gaugeStyle).toBe('skeleton')
    expect(loadSettings().gaugeStyle).toBe('skeleton')
  })
  it('persists simple in localStorage', () => {
    saveSettings({ ...DEFAULTS, gaugeStyle: 'simple' })
    expect(JSON.parse(mem.get('lanecast.settings')!).gaugeStyle).toBe('simple')
    expect(loadSettings().gaugeStyle).toBe('simple')
  })
  it('invalid stored value falls back to classic', () => {
    mem.set('lanecast.settings', JSON.stringify({ gaugeStyle: 'tourbillon' }))
    expect(loadSettings().gaugeStyle).toBe('classic')
  })
  it('type guard', () => {
    expect(isGaugeStyle('skeleton')).toBe(true)
    expect(isGaugeStyle('simple')).toBe(true)
    expect(isGaugeStyle('x')).toBe(false)
  })
  it('bothUnits defaults false and persists', () => {
    expect(DEFAULTS.bothUnits).toBe(false)
    expect(loadSettings().bothUnits).toBe(false)
    saveSettings({ ...DEFAULTS, gaugeStyle: 'simple', bothUnits: true })
    expect(loadSettings().bothUnits).toBe(true)
    expect(loadSettings().gaugeStyle).toBe('simple')
  })
  it('old settings without bothUnits get false', () => {
    mem.set('lanecast.settings', JSON.stringify({ unit: 'mph', gaugeStyle: 'simple' }))
    expect(loadSettings().bothUnits).toBe(false)
  })
})

describe('skeleton movement', () => {
  it('gears stop when stationary', () => { expect(gearPeriod(0)).toBe(0); expect(gearPeriod(0.3)).toBe(0); expect(gearPeriod(NaN)).toBe(0) })
  it('rotation speed is proportional to vehicle speed', () => {
    expect(gearPeriod(30)).toBe(8); expect(gearPeriod(10)).toBe(24)
    expect(1 / gearPeriod(20) / (1 / gearPeriod(10))).toBeCloseTo(2, 5)
  })
  it('gear path has 4 points per tooth', () => { expect(gearPath(0, 0, 10, 12).split('L')).toHaveLength(48) })
  it('roman numerals', () => { expect(roman(8)).toBe('VIII'); expect(roman(14)).toBe('XIV'); expect(roman(0)).toBe('0') })
})
