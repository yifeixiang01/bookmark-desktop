import type { DesktopApp, AppAction } from '../types'
import type { PomodoroApp, PomodoroAction } from './types'
import { createPomodoro, actOnPomodoro, finishPomodoro } from './model'

function accepts(action: AppAction): action is PomodoroAction { return typeof action === 'string' }

export const pomodoroDefinition = {
 type: 'pomodoro' as const, name: '番茄钟', description: '25 分钟专注，5 分钟休息，找到自己的节奏。', available: true as const,
 create: (): PomodoroApp => createPomodoro(),
 preview: (): PomodoroApp => { return createPomodoro() },
 settle: (app: DesktopApp, now: number): DesktopApp => app.type === 'pomodoro' ? finishPomodoro(app, now) : app,
 act: (app: DesktopApp, action: AppAction, now: number): DesktopApp => app.type === 'pomodoro' && accepts(action) ? actOnPomodoro(app, action, now) : app,
}

