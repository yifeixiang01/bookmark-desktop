import { useState } from 'react'
import type { AppType } from '@/types/bookmark'
import { appName, createAppPreview } from '@/apps'
import { AppTile } from '@/apps/AppTile'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function AppPreview({ type, onClose, onAdd }: { type: AppType; onClose: () => void; onAdd: () => void }) {
  const [app] = useState(() => createAppPreview(type))
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className={`rounded-[28px] border-white/70 bg-[#faf9f6] ${type === 'salary' ? 'max-w-md sm:max-w-md' : 'max-w-sm sm:max-w-sm'}`}>
      <DialogHeader><DialogTitle>{appName(type)}预览</DialogTitle><DialogDescription>桌面实际卡片样式 · 默认占 {type === 'salary' ? '4 × 4' : '3 × 3'} 个图标位</DialogDescription></DialogHeader>
      <div className="flex justify-center rounded-[24px] bg-gradient-to-br from-stone-100 to-stone-200/50 py-6 [&>.app-widget]:max-w-full"><AppTile app={app} width={type === 'salary' ? 352 : 260} height={type === 'salary' ? 432 : 320} preview /></div>
      <button type="button" className="app-action rounded-full bg-slate-800 py-2.5 text-sm text-white hover:bg-slate-700" onClick={onAdd}>添加到当前桌面</button>
    </DialogContent>
  </Dialog>
}
