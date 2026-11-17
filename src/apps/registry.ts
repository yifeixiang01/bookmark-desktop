import type { AppType, DesktopApp, AppAction } from './types'
import { createNote, actOnNote } from './note/model'
import { createTodo, actOnTodo } from './todo/model'
import { createWater, actOnWater, settleWater } from './water/model'
import { createWoodfish, actOnWoodfish } from './woodfish/model'
import { createPomodoro, finishPomodoro, actOnPomodoro } from './pomodoro/model'

export const APP_CATALOG = [
  { type: 'pomodoro', name: '番茄钟', description: '25 分钟专注，5 分钟休息，找到自己的节奏。', emoji: '🍅', available: true },
  { type: 'note', name: '便签', description: '随手记下灵感与重要的事，自动保存。', emoji: '📝', available: true },
  { type: 'todo', name: '今日待办', description: '记录要做的事，一件件完成。', emoji: '✅', available: true },
  { type: 'water', name: '喝水提醒', description: '定时补充水分，照顾忙碌中的自己。', emoji: '💧', available: true },
  { type: 'woodfish', name: '敲木鱼', description: '敲一下木鱼，给心情留一点平静。', emoji: '🪵', available: true },
  { type: 'pet', name: '桌宠', description: '让可爱的小伙伴陪你度过每一天。', emoji: '🐱', available: false },
] as const

export const appName = (type: AppType) => APP_CATALOG.find((a) => a.type === type)!.name
export function createApp(type: AppType, now = Date.now()): DesktopApp {
  switch (type) {
    case 'note': return createNote()
    case 'todo': return createTodo()
    case 'water': return createWater(now)
    case 'woodfish': return createWoodfish()
    case 'pomodoro': return createPomodoro()
  }
}
export function settleApp(app: DesktopApp, now: number): DesktopApp {
  if (app.type === 'pomodoro') return finishPomodoro(app, now)
  if (app.type === 'water') return settleWater(app, now)
  return app
}
export function actOnApp(app: DesktopApp, action: AppAction, now: number): DesktopApp {
  const current = settleApp(app, now)
  if (typeof action === 'string') return current.type === 'pomodoro' ? actOnPomodoro(current, action, now) : current
  switch (current.type) {
    case 'note': return actOnNote(current, action, now)
    case 'todo': return actOnTodo(current, action)
    case 'water': return actOnWater(current, action, now)
    case 'woodfish': return actOnWoodfish(current, action)
    default: return current
  }
}
