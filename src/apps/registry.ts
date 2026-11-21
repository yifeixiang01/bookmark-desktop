import type { AppType, DesktopApp, AppAction } from './types'
import { noteDefinition } from './note/definition'
import { todoDefinition } from './todo/definition'
import { waterDefinition } from './water/definition'
import { woodfishDefinition } from './woodfish/definition'
import { pomodoroDefinition } from './pomodoro/definition'
import { salaryDefinition } from './salary/definition'
import { answersDefinition } from './answers/definition'

const definitions = { note: noteDefinition, todo: todoDefinition, water: waterDefinition, woodfish: woodfishDefinition, pomodoro: pomodoroDefinition, salary: salaryDefinition, answers: answersDefinition }
export const APP_CATALOG = [definitions.pomodoro, definitions.note, definitions.todo, definitions.water, definitions.woodfish, definitions.salary, definitions.answers, { type: 'pet', name: '桌宠', description: '一只会散步、打盹和扑毛线球的橘白猫。', available: true }] as const
export const isAppType = (type: string): type is AppType => Object.hasOwn(definitions, type)
export const appName = (type: AppType) => definitions[type].name
export const createApp = (type: AppType, now = Date.now()): DesktopApp => definitions[type].create(now)
export const createAppPreview = (type: AppType): DesktopApp => definitions[type].preview()
export const settleApp = (app: DesktopApp, now: number): DesktopApp => definitions[app.type].settle(app, now)
export function actOnApp(app: DesktopApp, action: AppAction, now: number): DesktopApp {
 const current = settleApp(app, now)
 return definitions[current.type].act(current, action, now)
}
