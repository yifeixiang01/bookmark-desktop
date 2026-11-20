import { describe, expect, it } from 'vitest'
import { actOnSalary, createSalary, salarySnapshot } from './model'
import { actOnApp, createApp } from '../registry'
import { createInitialState, parseStateJSON } from '@/lib/store'

// November 2026 has 21 Monday–Friday workdays; use local dates like the card.
const at = (day: number, hour: number, minute = 0, second = 0) => new Date(2026, 10, day, hour, minute, second).getTime()
const app = { ...createSalary(), monthlySalary: 16800 }

describe('salary earnings', () => {
  it('uses actual working days and excludes lunch from salary and time', () => {
    const morning = salarySnapshot(app, at(2, 12))
    const lunch = salarySnapshot(app, at(2, 12, 45))
    const afternoon = salarySnapshot(app, at(2, 14))
    expect(morning.totalDays).toBe(21)
    expect(morning.daily).toBe(800)
    expect(morning.hourly).toBe(100)
    expect(morning.earned).toBe(300)
    expect(lunch.earned).toBe(300)
    expect(lunch.status).toBe('lunch')
    expect(afternoon.earned).toBe(400)
    expect(afternoon.workedSeconds).toBe(14400)
    expect(afternoon.remainingSeconds).toBe(14400)
  })
  it('increases every second only in working hours and caps the day', () => {
    expect(salarySnapshot(app, at(2, 10, 0, 1)).earned - salarySnapshot(app, at(2, 10)).earned).toBeCloseTo(100 / 3600)
    expect(salarySnapshot(app, at(2, 8)).earned).toBe(0)
    expect(salarySnapshot(app, at(2, 23)).earned).toBe(800)
    expect(salarySnapshot(app, at(2, 18)).remainingDays).toBe(20)
    expect(salarySnapshot(app, at(2, 17)).remainingDays).toBe(21)
  })
  it('keeps weekend daily income zero and derives monthly income after reopening', () => {
    const weekend = salarySnapshot(app, at(7, 14))
    expect(weekend.status).toBe('rest')
    expect(weekend.earned).toBe(0)
    expect(weekend.workedSeconds).toBe(0)
    expect(weekend.monthEarned).toBe(4000)
    expect(salarySnapshot(app, at(30, 18)).monthEarned).toBe(16800)
    expect(salarySnapshot(app, new Date(2026, 11, 1, 9).getTime()).monthEarned).toBe(0)
  })
  it('supports custom workweeks and no lunch', () => {
    const custom = { ...app, workdays: [0, 1, 2, 3, 4, 5, 6], lunchEnabled: false }
    const data = salarySnapshot(custom, at(1, 13, 30))
    expect(data.totalDays).toBe(30)
    expect(data.earned).toBeCloseTo(280)
    expect(data.progress).toBe(.5)
  })
  it('rejects invalid settings and round-trips settings through saved desktop state', () => {
    for (const invalid of [{ monthlySalary: -1 }, { monthlySalary: Infinity }, { end: '08:00' }, { start: '30:00' }, { lunchStart: '08:00' }, { workdays: [] }, { workdays: [1, 1] }]) {
      expect(actOnSalary(app, { type: 'salary-configure', settings: { ...app, ...invalid } })).toBe(app)
    }
    const configured = actOnApp(createApp('salary'), { type: 'salary-configure', settings: app }, at(2, 10))
    const state = createInitialState()
    state.partitions[0].items.push({ id: 'salary-test', kind: 'app', app: configured })
    expect(parseStateJSON(JSON.stringify(state))?.partitions[0].items.at(-1)).toEqual({ id: 'salary-test', kind: 'app', app })
  })
})
