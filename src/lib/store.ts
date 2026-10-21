import type { Trip } from './trip'
import type { Unit } from './speed'

export type Theme = 'auto' | 'light' | 'dark'
export interface Settings { unit: Unit; limit: number; limitOn: boolean; beep: boolean; theme: Theme }
export const DEFAULTS: Settings = { unit: 'mph', limit: 70, limitOn: true, beep: false, theme: 'auto' }

const K = { s: 'lanecast.settings', t: 'lanecast.trips' }
function read<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? { ...d, ...JSON.parse(v) } : d } catch { return d } }
export const loadSettings = () => read(K.s, DEFAULTS)
export const saveSettings = (s: Settings) => localStorage.setItem(K.s, JSON.stringify(s))
export function loadTrips(): Trip[] { try { return JSON.parse(localStorage.getItem(K.t) || '[]') } catch { return [] } }
export const saveTrips = (t: Trip[]) => localStorage.setItem(K.t, JSON.stringify(t))
