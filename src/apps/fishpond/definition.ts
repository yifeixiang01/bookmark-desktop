import type { AppAction, DesktopApp } from '../types'
import type { FishPondAction, FishPondApp } from './types'
import { actOnFishPond, createFishPond, settleFishPond } from './model'

function accepts(action: AppAction): action is FishPondAction { return typeof action !== 'string' && action.type.startsWith('fishpond-') }

export const fishPondDefinition = {
  type: 'fishpond' as const,
  name: '我的鱼塘',
  description: '在安静的后院鱼塘里喂鱼，享受片刻放松。',
  available: true as const,
  create: (now: number): FishPondApp => createFishPond(now),
  preview: (): FishPondApp => createFishPond(),
  settle: (app: DesktopApp, now: number): DesktopApp => app.type === 'fishpond' ? settleFishPond(app, now) : app,
  act: (app: DesktopApp, action: AppAction, now: number): DesktopApp => app.type === 'fishpond' && accepts(action) ? actOnFishPond(app, action, now) : app,
}
