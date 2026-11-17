export interface TodoApp { type: 'todo'; tasks: { id: string; text: string; done: boolean }[] }

export type TodoAction = { type: 'todo-add'; id: string; text: string } | { type: 'todo-toggle' | 'todo-remove'; id: string }
