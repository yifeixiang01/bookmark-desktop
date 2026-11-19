import './styles.css'
import { useState } from 'react'
import { Archive, History, Palette } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
    <div className="flex shrink-0 items-center gap-1 border-t border-stone-400/20 pt-1.5 text-xs text-stone-600">
      <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[10px] text-stone-500" title={`自动保存 · ${app.text.length}/5000 字`}>自动保存 · {app.text.length} 字</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><button type="button" disabled={disabled} aria-label="便签颜色" title="更换便签颜色" className="app-action flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/50 disabled:opacity-40"><Palette size={15} /></button></DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="rounded-xl" onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>便签颜色</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={app.color} onValueChange={(value) => { if (value === 'cream' || value === 'pink' || value === 'green') onAction({ type: 'note-color', color: value }) }}>
            {(['cream', 'pink', 'green'] as const).map((color) => <DropdownMenuRadioItem key={color} value={color}><span aria-hidden className={`h-3.5 w-3.5 rounded-full border border-stone-300 ${colors[color]}`} />{{ cream: '奶油黄', pink: '樱花粉', green: '薄荷绿' }[color]}</DropdownMenuRadioItem>)}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <button type="button" aria-label="归档便签" disabled={disabled || !app.text.trim()} onClick={() => onAction({ type: 'note-archive', id: uid() })} title="归档当前便签，开始新便签" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/50 disabled:opacity-40"><Archive size={15} /></button>
      <button type="button" aria-label={`便签历史（${shared.history?.length ?? 0}）`} disabled={disabled} onClick={() => setHistoryOpen(true)} title={`查看便签历史（${shared.history?.length ?? 0}）`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/50 disabled:opacity-40"><History size={15} /></button>
    </div>
    {historyOpen && <NoteHistory app={shared} onAction={onAction} onClose={() => setHistoryOpen(false)} />}
  </div>
}

