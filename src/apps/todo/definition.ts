import type { DesktopApp, AppAction } from '../types'
import type { TodoApp, TodoAction } from './types'
import { createTodo, actOnTodo } from './model'

function accepts(action: AppAction): action is TodoAction { return typeof action !== 'string' && action.type.startsWith('todo-') }

export const todoDefinition = {
 type: 'todo' as const, name: '今日待办', description: '记录要做的事，一件件完成。', available: true as const,
 create: (): TodoApp => createTodo(),
 preview: (): TodoApp => { return { ...createTodo(), tasks: [{ id: '1', text: '整理今天的工作计划', done: true }, { id: '2', text: '读几页喜欢的书', done: false }, { id: '3', text: '出门走一走', done: false }] } },
 settle: (app: DesktopApp): DesktopApp => app,
 act: (app: DesktopApp, action: AppAction): DesktopApp => app.type === 'todo' && accepts(action) ? actOnTodo(app, action) : app,
}

