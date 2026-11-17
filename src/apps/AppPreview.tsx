import { useState } from 'react'
import type { AppType } from '@/types/bookmark'
import { appName, createApp } from '@/apps'
import { AppTile } from '@/apps/AppTile'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function AppPreview({ type, onClose, onAdd }: { type: AppType; onClose: () => void; onAdd: () => void }) {
  const [app] = useState(() => {
    const sample = createApp(type)
    if (sample.type === 'note') sample.text = '灵感备忘\n\n今天也要给自己留一点时间。\n把想做的事，慢慢变成现实。'
    if (sample.type === 'todo') sample.tasks = [{ id: '1', text: '整理今天的工作计划', done: true }, { id: '2', text: '读几页喜欢的书', done: false }, { id: '3', text: '出门走一走', done: false }]
    if (sample.type === 'water') sample.cups = 3
    if (sample.type === 'woodfish') sample.count = 108
    return sample
  })
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className="max-w-sm sm:max-w-sm">
      <DialogHeader><DialogTitle>{appName(type)}预览</DialogTitle><DialogDescription>桌面实际卡片样式 · 默认占 3 × 3 个图标位</DialogDescription></DialogHeader>
      <div className="flex justify-center rounded-2xl bg-slate-100 py-4"><AppTile app={app} width={260} height={320} preview /></div>
      <button type="button" className="rounded-xl bg-slate-800 py-2.5 text-sm text-white hover:bg-slate-700" onClick={onAdd}>添加到当前桌面</button>
    </DialogContent>
  </Dialog>
}
