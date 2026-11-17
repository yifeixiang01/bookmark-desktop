import { expect, it } from 'vitest'
import { actOnApp, createApp } from '@/apps'
import { localDay } from '@/apps/water/model'
import { settleApp } from '@/apps'

  it('marks water due once, schedules from the drink time and respects paused reminders', () => {
    const water = createApp('water', 0)
    expect(settleApp(water, 3_599_999)).toBe(water)
    const due = settleApp(water, 3_600_000)
    expect(due).toMatchObject({ due: true, nextAt: null })
    expect(settleApp(due, 4_000_000)).toBe(due)
    const drank = actOnApp(due, { type: 'water-drink' }, 4_000_000)
    expect(drank).toMatchObject({ cups: 1, due: false, nextAt: 7_600_000 })
    const paused = actOnApp(drank, { type: 'water-toggle' }, 4_000_001)
    expect(actOnApp(paused, { type: 'water-drink' }, 4_000_002)).toMatchObject({ cups: 2, nextAt: null, enabled: false })
    expect(actOnApp(paused, { type: 'water-interval', minutes: -1 }, 4_000_003)).toBe(paused)
    const interval = actOnApp(paused, { type: 'water-interval', minutes: 30 }, 4_000_003)
    expect(actOnApp(interval, { type: 'water-toggle' }, 4_000_004)).toMatchObject({ nextAt: 5_800_004, enabled: true, interval: 30 })
  })

  it('resets cups across local midnight without losing a paused preference', () => {
    const before = new Date(2026, 10, 17, 23, 59).getTime()
    const after = new Date(2026, 10, 18, 0, 1).getTime()
    const water = actOnApp(actOnApp(createApp('water', before), { type: 'water-drink' }, before), { type: 'water-toggle' }, before)
    expect(settleApp(water, after)).toMatchObject({ cups: 0, day: localDay(after), enabled: false, nextAt: null })
  })
