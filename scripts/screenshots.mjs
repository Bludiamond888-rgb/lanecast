// Simulator-driven screenshots into screens/ (WebKit iPhone 13 portrait/landscape + 1920x1200 desktop). Checks for overflow & page errors.
import { webkit, devices } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from './serve.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { server, url } = await serve(path.join(root, 'dist'))
const out = (f) => path.join(root, 'screens', f)
let bad = 0
const now = Date.now(), H = 3600e3
const demoTrips = [
  { id: '1', start: now - 3 * H, end: now - 3 * H + 42 * 60e3, distance: 38400, top: 31.3, movingMs: 38 * 60e3 },
  { id: '2', start: now - 27 * H, end: now - 27 * H + 18 * 60e3, distance: 11200, top: 20.1, movingMs: 15 * 60e3 },
  { id: '3', start: now - 52 * H, end: now - 52 * H + 95 * 60e3, distance: 141000, top: 33.5, movingMs: 88 * 60e3 },
]
async function page(browser, opts, theme, extra = {}) {
  const ctx = await browser.newContext({ ...opts, colorScheme: theme, timezoneId: 'America/New_York' })
  await ctx.addInitScript(([t, e]) => {
    if (!localStorage.getItem('lanecast.trips')) localStorage.setItem('lanecast.trips', JSON.stringify(t))
    localStorage.setItem('lanecast.settings', JSON.stringify({ unit: 'mph', limit: 70, limitOn: true, beep: false, theme: 'auto', ...e }))
  }, [demoTrips, extra])
  const p = await ctx.newPage()
  p.on('pageerror', (e) => { bad++; console.log('PAGE ERROR', e.message) })
  return { ctx, p }
}
async function check(p, name) {
  const o = await p.evaluate(() => ({ sx: document.documentElement.scrollWidth > innerWidth, sy: document.documentElement.scrollHeight > innerHeight + 1 }))
  if (o.sx || (name.startsWith('drive') && o.sy)) { bad++; console.log('OVERFLOW', name, o) }
}
async function drive(browser, opts, theme, name, mph = 47, extra) {
  const { ctx, p } = await page(browser, opts, theme, extra)
  await p.goto(url + `?sim=1&mph=${mph}#/drive`)
  await p.click('[data-testid=trip-btn]'); await p.waitForTimeout(4500)
  await check(p, name); await p.screenshot({ path: out(name) }); await ctx.close()
}
const iphone = devices['iPhone 13'], land = devices['iPhone 13 landscape']
const desk = { viewport: { width: 1920, height: 1200 } }
const b = await webkit.launch()
await drive(b, iphone, 'light', 'drive-portrait-light.png')
await drive(b, iphone, 'dark', 'drive-portrait-dark.png')
await drive(b, land, 'light', 'drive-landscape.png', 52)
await drive(b, land, 'dark', 'drive-landscape-dark.png', 52)
await drive(b, desk, 'light', 'drive-desktop.png', 63)
await drive(b, desk, 'dark', 'drive-desktop-dark.png', 63)
await drive(b, iphone, 'light', 'drive-overlimit-portrait.png', 78)
await drive(b, land, 'dark', 'drive-overlimit.png', 78)
await drive(b, land, 'light', 'drive-overlimit-landscape-light.png', 78)
// waiting state (no sim, geolocation never answers)
{ const { ctx, p } = await page(b, iphone, 'light'); await p.goto(url + '#/drive'); await p.waitForTimeout(500); await p.screenshot({ path: out('drive-waiting.png') }); await ctx.close() }
for (const [r, f] of [['trips', 'trips'], ['settings', 'settings']]) for (const th of ['light', 'dark']) {
  const { ctx, p } = await page(b, iphone, th); await p.goto(url + `#/${r}`); await p.waitForTimeout(400)
  await check(p, f); await p.screenshot({ path: out(th === 'light' ? `${f}.png` : `${f}-dark.png`) }); await ctx.close()
}
await b.close(); server.close()
console.log(bad ? `DONE with ${bad} problems` : 'screens written, no overflow')
process.exit(bad ? 1 : 0)
