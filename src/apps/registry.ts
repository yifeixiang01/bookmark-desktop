import type { AppType, DesktopApp, AppAction } from './types'
import { noteDefinition } from './note/definition'
import { Card as NoteCard } from './note/Card'
import { todoDefinition } from './todo/definition'
import { Card as TodoCard } from './todo/Card'
import { waterDefinition } from './water/definition'
import { Card as WaterCard } from './water/Card'
import { woodfishDefinition } from './woodfish/definition'
import { Card as WoodfishCard } from './woodfish/Card'
import { pomodoroDefinition } from './pomodoro/definition'
import { Card as PomodoroCard } from './pomodoro/Card'

const definitions = { note: noteDefinition, todo: todoDefinition, water: waterDefinition, woodfish: woodfishDefinition, pomodoro: pomodoroDefinition }
export const APP_CARDS = { note: NoteCard, todo: TodoCard, water: WaterCard, woodfish: WoodfishCard, pomodoro: PomodoroCard }
export const APP_CATALOG = [definitions.pomodoro, definitions.note, definitions.todo, definitions.water, definitions.woodfish, { type: 'pet', name: '桌宠', description: '让可爱的小伙伴陪你度过每一天。', available: false }] as const
export const appName = (type: AppType) => definitions[type].name
export const createApp = (type: AppType, now = Date.now()): DesktopApp => definitions[type].create(now)
export const createAppPreview = (type: AppType): DesktopApp => definitions[type].preview()
export const settleApp = (app: DesktopApp, now: number): DesktopApp => definitions[app.type].settle(app, now)
export function actOnApp(app: DesktopApp, action: AppAction, now: number): DesktopApp {
 const current = settleApp(app, now)
 return definitions[current.type].act(current, action, now)
}
