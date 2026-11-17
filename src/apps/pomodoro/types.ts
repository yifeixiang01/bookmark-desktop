export interface PomodoroApp {
  type: 'pomodoro'
  mode: 'focus' | 'break'
  remaining: number
  /** 运行时保存绝对截止时间，刷新或切换桌面后仍能准确恢复。 */
  endsAt: number | null
  completed: number
  finished: boolean
}

export type PomodoroAction = 'toggle' | 'reset' | 'focus' | 'break'
