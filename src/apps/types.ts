import type { NoteApp, NoteAction } from './note/types'
import type { TodoApp, TodoAction } from './todo/types'
import type { WaterApp, WaterAction } from './water/types'
import type { WoodfishApp, WoodfishAction } from './woodfish/types'
import type { PomodoroApp } from './pomodoro/types'
import type { PomodoroAction } from './pomodoro/types'
import type { NoteArchive } from './note/types'
import type { PointerEvent } from 'react'
import type { SalaryApp, SalaryAction } from './salary/types'
import type { AnswersApp, AnswersAction } from './answers/types'
export type DesktopApp = { type: 'articles' } | NoteApp | TodoApp | WaterApp | WoodfishApp | PomodoroApp | SalaryApp | AnswersApp
export type AppType = DesktopApp['type']
export type AppAction = PomodoroAction | NoteAction | TodoAction | WaterAction | WoodfishAction | SalaryAction | AnswersAction
export interface ControlProps<T, A> { app: T; disabled: boolean; onAction: (action: A) => void }

export interface AppCardProps {
 app: DesktopApp
 width: number
 height: number
 editMode?: boolean
 locked?: boolean
 preview?: boolean
 onPress?: (e: PointerEvent) => void
 onAction?: (action: AppAction) => void
 onRemove?: () => void
  noteHistory?: NoteArchive[]
}
