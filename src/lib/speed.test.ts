import { describe, it, expect } from 'vitest'
import { haversine, speedFrom, smooth, toUnit, fromUnit } from './speed'
import { newTrip, addFix, avgMoving, finish, fmtDuration } from './trip'

describe('speed', () => {
  it('haversine: 1 deg lat ≈ 111.2 km', () => expect(haversine({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111195, -2))
  it('uses coords.speed when present', () => expect(speedFrom(null, { lat: 0, lon: 0, t: 0, speed: 12 })).toBe(12))
  it('derives speed from positions when speed is null', () => {
    const a = { lat: 37, lon: -122, t: 0, speed: null }
    const b = { lat: 37 + 0.0001, lon: -122, t: 1000, speed: null } // ~11.1 m
    expect(speedFrom(a, b)!).toBeCloseTo(11.12, 1)
  })
  it('ignores negative speed and tiny dt', () => {
    expect(speedFrom(null, { lat: 0, lon: 0, t: 0, speed: -1 })).toBeNull()
    expect(speedFrom({ lat: 0, lon: 0, t: 0 }, { lat: 0.001, lon: 0, t: 100 })).toBeNull()
  })
  it('treats jitter within accuracy as stopped', () =>
    expect(speedFrom({ lat: 0, lon: 0, t: 0, accuracy: 30 }, { lat: 0.00005, lon: 0, t: 1000, accuracy: 30 })).toBe(0))
  it('smooths, snaps to zero, rejects spikes', () => {
    expect(smooth(null, 10)).toBe(10)
    expect(smooth(10, 20)).toBeCloseTo(13.5)
    expect(smooth(0.4, 0)).toBe(0)
    expect(smooth(20, 500)).toBe(20)
  })
  it('unit conversions', () => {
    expect(toUnit(26.8224, 'mph')).toBeCloseTo(60, 3)
    expect(toUnit(10, 'kmh')).toBe(36)
    expect(fromUnit(60, 'mph')).toBeCloseTo(26.8224, 3)
  })
})

describe('trip', () => {
  it('accumulates distance, top, avg moving; excludes stopped time', () => {
    let s = newTrip(0)
    s = addFix(s, { lat: 0, lon: 0, t: 0, accuracy: 5 }, 0)
    s = addFix(s, { lat: 0.0001, lon: 0, t: 1000, accuracy: 5 }, 11)
    s = addFix(s, { lat: 0.0002, lon: 0, t: 2000, accuracy: 5 }, 12)
    s = addFix(s, { lat: 0.0002, lon: 0, t: 10000, accuracy: 5 }, 0) // stopped 8s
    expect(s.distance).toBeCloseTo(22.24, 1)
    expect(s.top).toBe(12)
    expect(s.movingMs).toBe(2000)
    expect(avgMoving(s)).toBeCloseTo(11.12, 1)
    const t = finish(s, 10000)
    expect(t.end - t.start).toBe(10000)
  })
  it('skips inaccurate fixes', () => {
    let s = addFix(newTrip(0), { lat: 0, lon: 0, t: 0, accuracy: 5 }, 10)
    s = addFix(s, { lat: 0.01, lon: 0, t: 1000, accuracy: 200 }, 10)
    expect(s.distance).toBe(0)
  })
  it('formats duration', () => { expect(fmtDuration(65000)).toBe('01:05'); expect(fmtDuration(3725000)).toBe('1:02:05') })
})
