import type { AppType, DesktopApp, AppAction } from './types'
import { noteDefinition } from './note/definition'
import { todoDefinition } from './todo/definition'
import { waterDefinition } from './water/definition'
import { woodfishDefinition } from './woodfish/definition'
import { pomodoroDefinition } from './pomodoro/definition'
import { fishPondDefinition } from './fishpond/definition'

const definitions = { note: noteDefinition, todo: todoDefinition, water: waterDefinition, woodfish: woodfishDefinition, pomodoro: pomodoroDefinition, fishpond: fishPondDefinition }
export const APP_CATALOG = [definitions.pomodoro, definitions.note, definitions.todo, definitions.water, definitions.woodfish, definitions.fishpond, { type: 'pet', name: '桌宠', description: '让可爱的小伙伴陪你度过每一天。', available: false }] as const
export const appName = (type: AppType) => definitions[type].name
export const createApp = (type: AppType, now = Date.now()): DesktopApp => definitions[type].create(now)
export const createAppPreview = (type: AppType): DesktopApp => definitions[type].preview()
export const settleApp = (app: DesktopApp, now: number): DesktopApp => definitions[app.type].settle(app, now)
export function actOnApp(app: DesktopApp, action: AppAction, now: number): DesktopApp {
 const current = settleApp(app, now)
 return definitions[current.type].act(current, action, now)
}
