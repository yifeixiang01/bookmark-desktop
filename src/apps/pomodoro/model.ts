import type { PomodoroApp } from './types'

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
