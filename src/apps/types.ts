import type { NoteApp, NoteAction } from './note/types'
import type { TodoApp, TodoAction } from './todo/types'
import type { WaterApp, WaterAction } from './water/types'
import type { WoodfishApp, WoodfishAction } from './woodfish/types'
import type { PomodoroApp } from './pomodoro/types'
import type { PomodoroAction } from './pomodoro/model'
export type DesktopApp = NoteApp | TodoApp | WaterApp | WoodfishApp | PomodoroApp
export type AppType = DesktopApp['type']
export type AppAction = PomodoroAction | NoteAction | TodoAction | WaterAction | WoodfishAction
export interface ControlProps<T> { app: T; disabled: boolean; onAction: (action: AppAction) => void }
