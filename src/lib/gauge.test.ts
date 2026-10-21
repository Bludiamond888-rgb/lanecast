import { describe, expect, it } from 'vitest'
import { angle, frac, gaugeMax, ticks } from './gauge'
describe('gauge', () => {
  it('max per unit', () => { expect(gaugeMax('mph')).toBe(160); expect(gaugeMax('kmh')).toBe(260) })
  it('angles span 270°', () => { expect(angle(0, 160)).toBe(-135); expect(angle(160, 160)).toBe(135); expect(angle(80, 160)).toBe(0) })
  it('clamps', () => { expect(frac(-5, 160)).toBe(0); expect(frac(999, 160)).toBe(1); expect(frac(NaN, 160)).toBe(0) })
  it('ticks: minor every 10, labels every 20', () => {
    const t = ticks(160); expect(t).toHaveLength(17); expect(t.filter((x) => x.major).map((x) => x.v)).toEqual([0, 20, 40, 60, 80, 100, 120, 140, 160])
    expect(ticks(260).filter((x) => x.major)).toHaveLength(14)
  })
})
