import type { TodoApp, TodoAction } from './types'

export const createTodo = (): TodoApp => ({ type: 'todo', tasks: [] })

export function actOnTodo(current: TodoApp, action: TodoAction): TodoApp {
  if (action.type === 'todo-add' && action.text.trim() && !current.tasks.some((t) => t.id === action.id)) return { ...current, tasks: [...current.tasks, { id: action.id, text: action.text.trim().slice(0, 200), done: false }] }
  if (action.type === 'todo-toggle') return { ...current, tasks: current.tasks.map((t) => t.id === action.id ? { ...t, done: !t.done } : t) }
  if (action.type === 'todo-remove') return { ...current, tasks: current.tasks.filter((t) => t.id !== action.id) }
  return current
}
