import type { WoodfishApp } from './types'
import type { AppAction } from '../types'

export const createWoodfish = (): WoodfishApp => ({ type: 'woodfish', count: 0, sound: true })

export function actOnWoodfish(current: WoodfishApp, action: Exclude<AppAction, string>): WoodfishApp {
  if (action.type === 'woodfish-hit') return { ...current, count: current.count + 1 }
  if (action.type === 'woodfish-sound') return { ...current, sound: !current.sound }
  return current
}
