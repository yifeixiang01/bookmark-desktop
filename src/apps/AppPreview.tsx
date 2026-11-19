import { useState } from 'react'
import type { AppType } from '@/types/bookmark'
import { appName, createAppPreview } from '@/apps'
import { AppTile } from '@/apps/AppTile'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function AppPreview({ type, onClose, onAdd }: { type: AppType; onClose: () => void; onAdd: () => void }) {
  const [app] = useState(() => createAppPreview(type))
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className="max-w-sm rounded-[28px] border-white/70 bg-[#faf9f6] sm:max-w-sm">
      <DialogHeader><DialogTitle>{appName(type)}预览</DialogTitle><DialogDescription>{type === 'fishpond' ? '添加后独占一个桌面分页 · 点击水面喂鱼' : '桌面实际卡片样式 · 默认占 3 × 3 个图标位'}</DialogDescription></DialogHeader>
      <div className="flex justify-center rounded-[24px] bg-gradient-to-br from-stone-100 to-stone-200/50 py-6"><AppTile app={app} width={260} height={320} preview /></div>
      <button type="button" className="app-action rounded-full bg-slate-800 py-2.5 text-sm text-white hover:bg-slate-700" onClick={onAdd}>添加到当前桌面</button>
    </DialogContent>
  </Dialog>
}
