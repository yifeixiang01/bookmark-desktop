import type { DesktopApp, AppAction } from '../types'
import type { WaterApp, WaterAction } from './types'
import { createWater, actOnWater, settleWater } from './model'

function accepts(action: AppAction): action is WaterAction { return typeof action !== 'string' && action.type.startsWith('water-') }

export const waterDefinition = {
 type: 'water' as const, name: '喝水提醒', emoji: '💧', description: '定时补充水分，照顾忙碌中的自己。', available: true as const,
 create: (now: number): WaterApp => createWater(now),
 preview: (): WaterApp => { return { ...createWater(Date.now()), cups: 3 } },
 settle: (app: DesktopApp, now: number): DesktopApp => app.type === 'water' ? settleWater(app, now) : app,
 act: (app: DesktopApp, action: AppAction, now: number): DesktopApp => app.type === 'water' && accepts(action) ? actOnWater(app, action, now) : app,
}

