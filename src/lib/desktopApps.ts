import type { PomodoroApp } from '@/types/bookmark'

export const APP_CATALOG = [
  { type: 'pomodoro', name: '番茄钟', description: '25 分钟专注，5 分钟休息，找到自己的节奏。', emoji: '🍅', available: true },
  { type: 'water', name: '喝水提醒', description: '定时补充水分，照顾忙碌中的自己。', emoji: '💧', available: false },
  { type: 'woodfish', name: '敲木鱼', description: '敲一下木鱼，给心情留一点平静。', emoji: '🪵', available: false },
  { type: 'pet', name: '桌宠', description: '让可爱的小伙伴陪你度过每一天。', emoji: '🐱', available: false },
] as const

export type PomodoroAction = 'toggle' | 'reset' | 'focus' | 'break'
export const durationOf = (mode: PomodoroApp['mode']) => mode === 'focus' ? 25 * 60 : 5 * 60

export function createPomodoro(): PomodoroApp {
  return { type: 'pomodoro', mode: 'focus', remaining: durationOf('focus'), endsAt: null, completed: 0, finished: false }
}

export function remainingSeconds(app: PomodoroApp, now: number): number {
  return app.endsAt === null ? app.remaining : Math.max(0, Math.min(app.remaining, Math.ceil((app.endsAt - now) / 1000)))
}

/** 完成状态只提交一次；计时使用绝对时间，不受页面休眠和切换空间影响。 */
export function finishPomodoro(app: PomodoroApp, now: number): PomodoroApp {
  if (app.endsAt === null || app.endsAt > now) return app
  return { ...app, endsAt: null, remaining: 0, finished: true, completed: app.completed + (app.mode === 'focus' ? 1 : 0) }
}

export function actOnPomodoro(app: PomodoroApp, action: PomodoroAction, now: number): PomodoroApp {
  const current = finishPomodoro(app, now)
  if (action === 'focus' || action === 'break') {
    return { ...current, mode: action, remaining: durationOf(action), endsAt: null, finished: false }
  }
  if (action === 'reset') return { ...current, remaining: durationOf(current.mode), endsAt: null, finished: false }
  if (current.endsAt !== null) return { ...current, remaining: remainingSeconds(current, now), endsAt: null }
  const remaining = current.remaining || durationOf(current.mode)
  return { ...current, remaining, endsAt: now + remaining * 1000, finished: false }
}
