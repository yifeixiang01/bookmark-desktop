import { useState } from 'react'
import type { Bookmark, Partition } from '@/types/bookmark'
import { allBookmarks } from '@/lib/store'
import { sameBookmark } from '@/lib/bookmarkActions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'

export function BookmarkSpaceDialog({ bookmark, partitions, sourceId, mode, onClose, onConfirm }: {
  bookmark: Bookmark
  partitions: Partition[]
  sourceId: string
  mode: 'copy' | 'delete'
  onClose: () => void
  onConfirm: (ids: string[], allSpaces: boolean) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [scope, setScope] = useState('current')
  const others = partitions.filter((p) => p.id !== sourceId)
  const shared = others.filter((p) => allBookmarks(p).some((b) => sameBookmark(b, bookmark)))
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>{mode === 'copy' ? '复制到其它空间' : `删除「${bookmark.name}」？`}</DialogTitle>
          <DialogDescription>{mode === 'copy' ? '选择目标空间，书签会复制到目标空间的桌面。' : '删除后不可撤销，请确认删除范围。'}</DialogDescription>
        </DialogHeader>
        {mode === 'copy' ? (
          <div className="max-h-72 overflow-y-auto space-y-2">
            {partitions.map((p) => {
              const exists = allBookmarks(p).some((b) => sameBookmark(b, bookmark))
              const disabled = p.id === sourceId || exists
              return <label key={p.id} className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'}`}>
                <input type="checkbox" disabled={disabled} checked={selected.includes(p.id)} onChange={(e) => setSelected((ids) => e.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id))} />
                <span className="min-w-0 flex-1 break-words">{p.name}</span>
                {disabled && <span className="shrink-0 text-xs text-slate-500">{p.id === sourceId ? '当前空间' : '已存在'}</span>}
              </label>
            })}
          </div>
        ) : shared.length > 0 ? (
          <fieldset className="space-y-3 text-sm">
            <legend className="mb-3 text-slate-500">此书签也存在于 {shared.length} 个其他空间</legend>
            <label className="flex gap-2"><input type="radio" name="delete-scope" checked={scope === 'current'} onChange={() => setScope('current')} />只删除当前空间</label>
            <label className="flex gap-2"><input type="radio" name="delete-scope" checked={scope === 'all'} onChange={() => setScope('all')} />删除所有空间</label>
          </fieldset>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant={mode === 'delete' ? 'destructive' : 'default'} disabled={mode === 'copy' && !selected.length} onClick={() => onConfirm(selected, scope === 'all')}>
            {mode === 'copy' ? '确认复制' : '确认删除'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
