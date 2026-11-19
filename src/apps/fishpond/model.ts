import type { FishPondAction, FishPondApp } from './types'
import { inPond } from './simulation'

export const localDay = (now: number) => {
  const date = new Date(now)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

export const createFishPond = (now = Date.now()): FishPondApp => ({ type: 'fishpond', weather: 'sunny', fishFed: 0, lastFedAt: null, day: localDay(now) })

export function settleFishPond(app: FishPondApp, now: number): FishPondApp {
  const day = localDay(now)
  return app.day === day ? app : { ...app, day, fishFed: 0 }
}

export function actOnFishPond(current: FishPondApp, action: FishPondAction, now: number): FishPondApp {
  if (action.type === 'fishpond-feed' && inPond(action)) return { ...current, fishFed: current.fishFed + 1, lastFedAt: now }
  if (action.type === 'fishpond-weather' && ['sunny', 'rainy', 'night'].includes(action.weather)) return { ...current, weather: action.weather }
  return current
}
