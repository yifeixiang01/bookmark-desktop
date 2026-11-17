import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { uid } from '@/lib/store'
import type { TodoApp, TodoAction } from './types'
import type { ControlProps } from '../types'

export function Todo({ app, disabled, onAction }: ControlProps<TodoApp, TodoAction>) {
  const [text, setText] = useState('')
  const completed = app.tasks.filter((t) => t.done).length
  return <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
    <div className="flex items-center justify-between text-xs text-stone-500"><span>一步一步，完成今天</span><span>{completed}/{app.tasks.length}</span></div>
    <div className="h-1 shrink-0 overflow-hidden rounded-full bg-emerald-100"><div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${app.tasks.length ? completed / app.tasks.length * 100 : 0}%` }} /></div>
    <div data-app-scroll className="min-h-0 flex-1 space-y-1 overflow-y-auto" style={{ touchAction: 'pan-y' }}>
      {!app.tasks.length && <p className="py-8 text-center text-xs leading-6 text-stone-400">今天想完成什么？<br />先从一件小事开始。</p>}
      {app.tasks.map((task) => <div key={task.id} className="group flex items-start gap-2 rounded-lg py-1.5">
        <input aria-label={`完成：${task.text}`} type="checkbox" checked={task.done} disabled={disabled} onChange={() => onAction({ type: 'todo-toggle', id: task.id })} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
        <span className={`min-w-0 flex-1 break-words text-xs leading-5 ${task.done ? 'text-stone-400 line-through' : 'text-stone-700'}`}>{task.text}</span>
        <button type="button" disabled={disabled} aria-label={`删除待办：${task.text}`} onClick={() => onAction({ type: 'todo-remove', id: task.id })} className="rounded p-0.5 text-stone-400 hover:text-red-500"><Trash2 size={13} /></button>
      </div>)}
    </div>
    <form className="flex shrink-0 gap-1 rounded-xl border border-stone-200 bg-white/80 p-1" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; onAction({ type: 'todo-add', id: uid(), text }); setText('') }}>
      <input aria-label="新待办" disabled={disabled} maxLength={200} placeholder="添加一件事…" value={text} onChange={(e) => setText(e.target.value)} className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none" />
      <button type="submit" aria-label="添加待办" disabled={disabled || !text.trim()} className="rounded-lg bg-emerald-600 p-2 text-white disabled:opacity-40"><Plus size={16} /></button>
    </form>
  </div>
}

