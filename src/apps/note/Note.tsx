import './styles.css'
import { useState } from 'react'
import { Archive, History } from 'lucide-react'
import { uid } from '@/lib/store'
import { NoteHistory } from './NoteHistory'
import type { NoteApp, NoteAction } from './types'
import type { ControlProps } from '../types'

const colors = { cream: 'bg-[#fff7cf]/95', pink: 'bg-[#ffe4ec]/95', green: 'bg-[#e0f2df]/95' }
export function Note({ app, disabled, onAction, history }: ControlProps<NoteApp, NoteAction> & { history: NoteApp['history'] }) {
  const shared = { ...app, history: history ?? app.history }
  const [historyOpen, setHistoryOpen] = useState(false)
  return <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
    <textarea aria-label="便签内容" placeholder="写下灵感，或一件别忘记的小事…" disabled={disabled} value={app.text} maxLength={5000} onChange={(e) => onAction({ type: 'note-text', text: e.target.value })} className="app-scrollbar note-paper min-h-0 flex-1 resize-none bg-transparent text-sm leading-7 text-stone-700 outline-none placeholder:text-stone-400 disabled:opacity-80" style={{ touchAction: 'pan-y' }} />
    <div className="flex shrink-0 items-center gap-2 border-t border-stone-400/20 pt-2 text-xs text-stone-600">
      <div className="flex items-center gap-1.5">{(['cream', 'pink', 'green'] as const).map((color) => <button key={color} type="button" disabled={disabled} aria-label={`便签颜色${{ cream: '奶油黄', pink: '樱花粉', green: '薄荷绿' }[color]}`} aria-pressed={app.color === color} onClick={() => onAction({ type: 'note-color', color })} className={`app-action h-4 w-4 rounded-full border border-stone-400/40 ${colors[color]} ${app.color === color ? 'ring-1 ring-stone-500 ring-offset-1' : ''}`} />)}</div>
      <span className="min-w-0 flex-1 truncate text-[10px] text-stone-500">{app.text.length}/5000 · 自动保存</span>
      <button type="button" disabled={disabled || !app.text.trim()} onClick={() => onAction({ type: 'note-archive', id: uid() })} title="保存到历史并开始一张新便签" className="flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-white/50 disabled:opacity-40"><Archive size={13} />归档</button>
      <button type="button" disabled={disabled} onClick={() => setHistoryOpen(true)} className="flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-white/50 disabled:opacity-40"><History size={13} />历史（{shared.history?.length ?? 0}）</button>
    </div>
    {historyOpen && <NoteHistory app={shared} onAction={onAction} onClose={() => setHistoryOpen(false)} />}
  </div>
}

