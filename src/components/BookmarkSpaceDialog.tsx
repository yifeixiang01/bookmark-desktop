import { useState } from 'react'
import type { Bookmark, Partition } from '@/types/bookmark'
import { allBookmarks } from '@/lib/store'
import { sameBookmark } from '@/lib/bookmarkActions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { ConfirmDialog } from './ConfirmDialog'
import { FaviconImg } from './FaviconImg'

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
  if (mode === 'delete') return (
    <ConfirmDialog
      open
      title={`删除书签「${bookmark.name}」？`}
      description="删除后不可撤销，请确认删除范围。"
      icon={(
        <div className="grid h-16 w-16 place-items-center rounded-[18px] border-2 border-slate-300 bg-slate-100 p-2 shadow-sm">
          <FaviconImg url={bookmark.url} name={bookmark.name} customIcon={bookmark.icon} size={44} />
        </div>
      )}
      onCancel={onClose}
      onConfirm={() => onConfirm([], scope === 'all')}
    >
      {shared.length > 0 && (
        <fieldset className="mt-4 space-y-3 text-sm text-slate-700">
          <legend className="mb-3 text-slate-500">此书签也存在于 {shared.length} 个其他空间</legend>
          <label className="flex cursor-pointer items-center gap-2"><input type="radio" name="delete-scope" checked={scope === 'current'} onChange={() => setScope('current')} />只删除当前空间</label>
          <label className="flex cursor-pointer items-center gap-2"><input type="radio" name="delete-scope" checked={scope === 'all'} onChange={() => setScope('all')} />删除所有空间</label>
        </fieldset>
      )}
    </ConfirmDialog>
  )
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>复制到其它空间</DialogTitle>
          <DialogDescription>选择目标空间，书签会复制到目标空间的桌面。</DialogDescription>
        </DialogHeader>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {partitions.map((p) => {
              const exists = allBookmarks(p).some((b) => sameBookmark(b, bookmark))
              const disabled = p.id === sourceId || exists
              return <label key={p.id} className={`space-choice flex items-center gap-3 rounded-lg border p-3 text-sm ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'}`}>
                <input type="checkbox" disabled={disabled} checked={selected.includes(p.id)} onChange={(e) => setSelected((ids) => e.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id))} />
                <span className="min-w-0 flex-1 break-words">{p.name}</span>
                {disabled && <span className="shrink-0 text-xs text-slate-500">{p.id === sourceId ? '当前空间' : '已存在'}</span>}
              </label>
            })}
          </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button disabled={!selected.length} onClick={() => onConfirm(selected, false)}>
            确认复制
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
