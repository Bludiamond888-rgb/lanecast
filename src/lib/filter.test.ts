import { describe, it, expect } from 'vitest'
import { SpeedFilter, signalLevel, calibrate, MPS_TO_MPH } from './speed'

const mph = (m: number) => m / MPS_TO_MPH
describe('SpeedFilter', () => {
  it('uses Doppler speed immediately on first fix and light EMA after', () => {
    const f = new SpeedFilter()
    f.update({ lat: 0, lon: 0, t: 0, speed: 20, accuracy: 5 }); expect(f.value).toBe(20)
    f.update({ lat: 0, lon: 0, t: 1000, speed: 30, accuracy: 5 }); expect(f.value).toBeCloseTo(27)
  })
  it('ignores inaccurate fixes and keeps last good', () => {
    const f = new SpeedFilter()
    f.update({ lat: 0, lon: 0, t: 0, speed: 20, accuracy: 5 })
    expect(f.update({ lat: 0, lon: 0, t: 1000, speed: 5, accuracy: 50 })).toBe(false)
    expect(f.value).toBe(20)
  })
  it('falls back to distance/time when speed is null', () => {
    const f = new SpeedFilter()
    f.update({ lat: 37, lon: -122, t: 0, speed: null, accuracy: 3 })
    f.update({ lat: 37.0001, lon: -122, t: 1000, speed: null, accuracy: 3 })
    expect(f.value!).toBeCloseTo(11.12, 1)
  })
  it('discards implausible derived jumps (>15 mph in <0.5 s)', () => {
    const f = new SpeedFilter()
    f.update({ lat: 37, lon: -122, t: 0, speed: 10, accuracy: 3 })
    expect(f.update({ lat: 37.0005, lon: -122, t: 400, speed: null, accuracy: 3 })).toBe(false) // ~139 m/s
    expect(f.value).toBe(10)
  })
  it('snaps to 0 after two fixes under 1 mph', () => {
    const f = new SpeedFilter()
    f.update({ lat: 0, lon: 0, t: 0, speed: 5, accuracy: 5 })
    f.update({ lat: 0, lon: 0, t: 1000, speed: mph(0.5), accuracy: 5 }); expect(f.value).toBeGreaterThan(0)
    f.update({ lat: 0, lon: 0, t: 2000, speed: mph(0.5), accuracy: 5 }); expect(f.value).toBe(0)
    expect(f.predict(2500)).toBe(0)
  })
  it('extrapolates with capped acceleration, never negative', () => {
    const f = new SpeedFilter(1)
    f.update({ lat: 0, lon: 0, t: 0, speed: 10, accuracy: 5 })
    f.update({ lat: 0, lon: 0, t: 1000, speed: 30, accuracy: 5 })
    expect(f.accel).toBe(4)
    expect(f.predict(1250)).toBeCloseTo(31)
    expect(f.predict(5000)).toBeCloseTo(31.2) // capped at 0.3 s
    const g = new SpeedFilter(1)
    g.update({ lat: 0, lon: 0, t: 0, speed: 3, accuracy: 5 })
    g.update({ lat: 0, lon: 0, t: 1000, speed: 1, accuracy: 5 })
    expect(g.predict(1300)).toBeGreaterThanOrEqual(0)
  })
  it('signal level and calibration', () => {
    expect(signalLevel(null, null, 0)).toBe('lost')
    expect(signalLevel(0, 5, 1000)).toBe('good')
    expect(signalLevel(0, 25, 1000)).toBe('weak')
    expect(signalLevel(0, 5, 3500)).toBe('lost')
    expect(calibrate(60, 1.5, 'mph')).toBe(61.5)
    expect(calibrate(0, 2, 'mph')).toBe(0)
    expect(calibrate(100, 1, 'kmh')).toBeCloseTo(101.609)
  })
})
