import { useState } from 'react'
import { Archive, History } from 'lucide-react'
import { uid } from '@/lib/store'
import { NoteHistory } from './NoteHistory'
import type { NoteApp } from './types'
import type { ControlProps } from '../types'

const colors = { cream: 'bg-[#fff7cf]/95', pink: 'bg-[#ffe4ec]/95', green: 'bg-[#e0f2df]/95' }
export function Note({ app, disabled, onAction }: ControlProps<NoteApp>) {
  const [historyOpen, setHistoryOpen] = useState(false)
  return <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
    <textarea aria-label="便签内容" placeholder="写下灵感，或一件别忘记的小事…" disabled={disabled} value={app.text} maxLength={5000} onChange={(e) => onAction({ type: 'note-text', text: e.target.value })} className="min-h-0 flex-1 resize-none bg-transparent text-sm leading-7 text-stone-700 outline-none placeholder:text-stone-400 disabled:opacity-80" style={{ touchAction: 'pan-y' }} />
    <div className="flex items-center gap-2">{(['cream', 'pink', 'green'] as const).map((color) => <button key={color} type="button" disabled={disabled} aria-label={`便签颜色${{ cream: '奶油黄', pink: '樱花粉', green: '薄荷绿' }[color]}`} aria-pressed={app.color === color} onClick={() => onAction({ type: 'note-color', color })} className={`h-5 w-5 rounded-full border border-stone-400/40 ${colors[color]} ${app.color === color ? 'ring-1 ring-stone-500 ring-offset-2' : ''}`} />)}<span className="ml-auto text-[10px] text-stone-500">自动保存 · {app.text.length}/5000</span></div>
    <div className="flex shrink-0 items-center justify-between border-t border-stone-400/20 pt-2 text-xs text-stone-600">
      <button type="button" disabled={disabled || !app.text.trim()} onClick={() => onAction({ type: 'note-archive', id: uid() })} title="保存到历史并开始一张新便签" className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/50 disabled:opacity-40"><Archive size={14} />归档</button>
      <button type="button" disabled={disabled} onClick={() => setHistoryOpen(true)} className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/50 disabled:opacity-40"><History size={14} />历史（{app.history?.length ?? 0}）</button>
    </div>
    {historyOpen && <NoteHistory app={app} onAction={onAction} onClose={() => setHistoryOpen(false)} />}
  </div>
}

