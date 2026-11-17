import type { WaterApp } from './types'
import type { AppAction } from '../types'

export const localDay = (now: number) => {
  const date = new Date(now)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

export const createWater = (now: number): WaterApp => ({ type: 'water', interval: 60, nextAt: now + 3_600_000, enabled: true, due: false, day: localDay(now), cups: 0 })

export function settleWater(app: WaterApp, now: number): WaterApp {
  const newDay = app.day !== localDay(now)
  const due = app.enabled && app.nextAt !== null && app.nextAt <= now
  if (!newDay && !due) return app
  return { ...app, ...(newDay ? { day: localDay(now), cups: 0 } : {}), ...(due ? { nextAt: null, due: true } : {}) }
}


export function actOnWater(current: WaterApp, action: Exclude<AppAction, string>, now: number): WaterApp {
  if (action.type === 'water-drink') return { ...current, cups: current.cups + 1, due: false, nextAt: current.enabled ? now + current.interval * 60_000 : null }
  if (action.type === 'water-toggle') return { ...current, enabled: !current.enabled, due: false, nextAt: current.enabled ? null : now + current.interval * 60_000 }
  if (action.type === 'water-interval' && [30, 45, 60, 90, 120].includes(action.minutes)) return { ...current, interval: action.minutes, due: false, nextAt: current.enabled ? now + action.minutes * 60_000 : null }
  return current
}
