import { useState } from 'react'
import { Archive, Search, Trash2 } from 'lucide-react'
import type { NoteApp, NoteAction } from './types'
import { uid } from '@/lib/store'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const dateLabel = (time: number) => new Date(time).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })

export function NoteHistory({ app, onAction, onClose }: { app: NoteApp; onAction: (action: NoteAction) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const history = [...(app.history ?? [])].sort((a, b) => b.archivedAt - a.archivedAt)
  const entries = history.filter((entry) => `${entry.text} ${dateLabel(entry.createdAt)} ${dateLabel(entry.archivedAt)}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0]

  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className="note-history-dialog flex h-[min(620px,85dvh)] max-w-3xl flex-col gap-4 overflow-hidden sm:max-w-3xl" onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Archive size={18} />便签历史 <span className="text-sm font-normal text-slate-400">{history.length} 条</span></DialogTitle>
        <DialogDescription>当前空间的所有便签共享历史，移除卡片不影响归档。恢复前会自动归档当前内容。</DialogDescription>
      </DialogHeader>
      <label className="flex shrink-0 items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-slate-400"><Search size={16} /><input aria-label="搜索便签历史" placeholder="搜索内容或日期，例如 2026/11/17" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none" /></label>
      {!entries.length ? <div role="status" className="flex flex-1 items-center justify-center text-sm text-slate-400">{history.length ? '没有找到匹配的便签' : '还没有归档，写完后点击卡片上的「归档」即可保存。'}</div> :
        <div className="flex min-h-0 flex-1 flex-col gap-3 sm:flex-row">
          <div aria-label="历史便签列表" className="max-h-32 shrink-0 space-y-2 overflow-y-auto sm:max-h-none sm:w-52">
            {entries.map((entry) => <button key={entry.id} type="button" aria-label={`查看便签：${entry.text.split('\n')[0]}`} aria-pressed={selected?.id === entry.id} onClick={() => setSelectedId(entry.id)} className={`w-full rounded-xl border p-3 text-left ${selected?.id === entry.id ? 'border-amber-300 bg-amber-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
              <p className="truncate text-sm font-medium text-slate-700">{entry.text.split('\n').find((line) => line.trim()) || '未命名便签'}</p><p className="mt-1 text-[11px] text-slate-400">{dateLabel(entry.archivedAt)}</p>
            </button>)}
          </div>
          {selected && <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 shrink-0 space-y-1 border-b pb-3 text-[11px] text-slate-400"><p>创建于 {dateLabel(selected.createdAt)}</p><p>归档于 {dateLabel(selected.archivedAt)}</p></div>
            <p aria-label="历史便签全文" className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 select-text">{selected.text}</p>
            <button type="button" className="mt-4 shrink-0 rounded-xl bg-slate-800 px-4 py-2.5 text-sm text-white hover:bg-slate-700" onClick={() => { onAction({ type: 'note-restore', id: selected.id, draftId: uid() }); onClose() }}>恢复到当前便签</button>
            {deletingId === selected.id ? <div className="mt-3 shrink-0 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              <p>永久删除这条归档？当前空间所有便签的历史都会更新，无法恢复。</p>
              <div className="mt-2 flex gap-3"><button type="button" onClick={() => { onAction({ type: 'note-history-delete', id: selected.id }); setDeletingId(null) }} className="rounded bg-red-600 px-3 py-1.5 text-white">确认删除历史</button><button type="button" onClick={() => setDeletingId(null)}>取消删除</button></div>
            </div> : <button type="button" aria-label="删除这条历史" className="mt-2 flex shrink-0 items-center justify-center gap-1 py-1 text-xs text-red-600 hover:text-red-700" onClick={() => setDeletingId(selected.id)}><Trash2 size={13} />删除这条历史</button>}
          </div>}
        </div>}
    </DialogContent>
  </Dialog>
}
