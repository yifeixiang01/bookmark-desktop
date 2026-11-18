import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { SortablePartitionRow } from './SortablePartitionRow'
import type { AppType, Partition } from '@/types/bookmark'
import { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Settings, Plus, Trash2, Upload, Download, FileUp, Pencil, LogOut, Cloud, CloudUpload } from 'lucide-react'
import { WallpaperPicker } from './WallpaperPicker'
import { APP_CATALOG } from '@/apps'
import { AppPreview } from '@/apps/AppPreview'
import { AppIcon } from '@/apps/AppIcon'

const SETTINGS_SECTIONS = [
  ['partitions', '空间管理'], ['apps', '应用中心'], ['wallpaper', '壁纸背景'], ['data', '数据备份'], ['account', '账号'],
] as const

interface Props {
  currentPartitionName: string
  appCounts: Partial<Record<AppType, number>>
  onAddApp: (type: AppType) => void
  partitions: Partition[]
  onAddPartition: (name: string) => void
  onRenamePartition: (id: string, name: string) => void
  onReorderPartitions: (sourceId: string, targetId: string) => void
  onDeletePartition: (id: string) => void
  wallpaper: string
  onWallpaper: (id: string) => void
  onImportHTML: (file: File) => void
  onExportJSON: () => void
  onImportJSON: (file: File) => void
  accountLabel: string
  syncing: boolean
  syncError?: string
  onLogout: () => void
}

export function SettingsMenu({
  currentPartitionName, appCounts, onAddApp,
  wallpaper, onWallpaper, onImportHTML, onExportJSON, onImportJSON,
  accountLabel, syncing, syncError, onLogout, partitions, onAddPartition, onRenamePartition, onDeletePartition, onReorderPartitions,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const [section, setSection] = useState('partitions')
  const [previewType, setPreviewType] = useState<AppType | null>(null)
  const [open, setOpen] = useState(false)
  const [newPartition, setNewPartition] = useState('')
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const htmlInput = useRef<HTMLInputElement>(null)
  const jsonInput = useRef<HTMLInputElement>(null)

  return (
    <div className="fixed right-4 top-4 z-20 flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-1.5 rounded-full bg-black/25 px-3.5 py-2 text-[13px] text-white/90 backdrop-blur-md border border-white/15 hover:bg-black/35 transition-colors">
            <Settings size={14} />设置
          </button>
        </DialogTrigger>
        <DialogContent className="flex h-[min(640px,85dvh)] max-w-3xl flex-col gap-0 overflow-hidden bg-white/95 p-0 backdrop-blur-xl sm:max-w-3xl">
          <DialogHeader className="border-b px-6 py-5 text-left">
            <DialogTitle>设置</DialogTitle>
            <DialogDescription>管理空间、应用、壁纸背景、书签备份和账号。</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1">
            <nav aria-label="设置分类" className="w-24 shrink-0 overflow-y-auto border-r bg-slate-50/80 p-2 sm:w-40 sm:p-3">
              <div className="relative isolate flex flex-col gap-1">
                <div aria-hidden="true" className="settings-nav-indicator pointer-events-none absolute inset-x-0 top-0 h-11 rounded-xl bg-slate-800 shadow-sm" style={{ transform: `translateY(${SETTINGS_SECTIONS.findIndex(([id]) => id === section) * 48}px)` }} />
              {SETTINGS_SECTIONS.map(([id, label]) => (
                <button key={id} type="button" aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)} className={`settings-nav-button relative z-10 flex h-11 w-full shrink-0 items-center rounded-xl px-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 sm:px-3 sm:text-sm ${section === id ? 'font-medium text-white' : 'text-slate-600 hover:bg-slate-200/50'}`}><span>{label}</span></button>
              ))}
              </div>
            </nav>
            <div className="settings-panels min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <section hidden={section !== 'apps'} className="space-y-4">
            <div><h3 className="text-base font-semibold">应用中心</h3><p className="mt-1 text-xs leading-5 text-slate-500">挑选适合你的工具，添加到「{currentPartitionName}」空间，让桌面更顺手。</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {APP_CATALOG.map((app) => <article key={app.type} className="app-catalog-entry group relative flex flex-col overflow-hidden rounded-[24px] border border-stone-200/70 bg-gradient-to-br from-white to-stone-50/80 p-5 shadow-sm">
                <div className="mb-4 flex h-12 items-center transition-transform duration-300 group-hover:translate-x-1"><AppIcon type={app.type} /></div>
                <h4 className="text-sm font-semibold tracking-wide text-slate-800">{app.name}</h4>
                <p className="mb-4 mt-1 flex-1 text-xs leading-5 text-slate-500">{app.description}</p>
                {app.available ? <>
                  <div className="flex flex-wrap gap-2"><button type="button" aria-label={`预览${app.name}`} className="app-action rounded-full border border-stone-200 bg-white px-4 py-2 text-xs text-stone-500 hover:border-stone-400" onClick={() => setPreviewType(app.type)}>预览</button><button type="button" aria-label={`添加${app.name}到当前桌面`} className="app-action flex flex-1 items-center justify-center gap-1 rounded-full bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700" onClick={() => onAddApp(app.type)}><Plus size={14} />添加到桌面</button></div>
                  <p role="status" className="mt-2 text-center text-[11px] text-slate-400">{appCounts[app.type] ? `当前桌面已添加 ${appCounts[app.type]} 张` : '可添加多个，独立保存'}</p>
                </> : <button type="button" disabled className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-400">即将上线</button>}
              </article>)}
            </div>
          </section>
          <section hidden={section !== 'account'} className="space-y-4">
            <h3 className="text-base font-semibold">账号</h3>
          <div className="rounded-xl bg-slate-100 px-3 py-2">
            <p className="truncate text-sm font-medium text-slate-700">{accountLabel}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              {syncing ? <CloudUpload size={12} /> : <Cloud size={12} />}
              {syncError ? '尚未同步，请查看页面提示' : syncing ? '同步中…' : '已同步到云端'}
            </p>
          </div>
            <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => { setOpen(false); onLogout() }}><LogOut size={14} />退出登录</button>
          </section>
          <section hidden={section !== 'partitions'} className="space-y-3">
            <h3 className="text-sm font-medium">空间管理</h3>
            <form className="flex gap-2" onSubmit={(e) => {
              e.preventDefault()
              if (!newPartition.trim()) return
              onAddPartition(newPartition.trim())
              setNewPartition('')
            }}>
              <input aria-label="新空间名称" placeholder="输入新空间名称" className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm" value={newPartition} onChange={(e) => setNewPartition(e.target.value)} />
              <button disabled={!newPartition.trim()} className="flex items-center gap-1 rounded-md bg-slate-800 px-3 text-sm text-white disabled:opacity-40"><Plus size={14} />新增</button>
            </form>
            <p className="text-xs text-slate-500">拖动左侧手柄调整顺序，自动保存并同步到空间栏。</p>
            <DndContext sensors={sensors} modifiers={[({ transform }) => ({ ...transform, x: 0 })]} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
              if (over && active.id !== over.id) onReorderPartitions(String(active.id), String(over.id))
            }}>
            <SortableContext items={partitions.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
            {partitions.map((p) => (
              <SortablePartitionRow key={p.id} id={p.id} name={p.name} disabled={renaming !== null || partitions.length < 2}>
                {renaming?.id === p.id ? (
                  <form className="flex min-w-0 flex-1 gap-2" onSubmit={(e) => {
                    e.preventDefault()
                    if (!renaming.name.trim()) return
                    onRenamePartition(p.id, renaming.name.trim())
                    setRenaming(null)
                  }}>
                    <input aria-label="空间名称" autoFocus className="min-w-0 flex-1 rounded border px-2 text-sm" value={renaming.name} onChange={(e) => setRenaming({ id: p.id, name: e.target.value })} />
                    <button className="text-sm text-sky-700" disabled={!renaming.name.trim()}>保存</button>
                    <button type="button" className="text-sm text-slate-500" onClick={() => setRenaming(null)}>取消</button>
                  </form>
                ) : <>
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <button type="button" aria-label={`修改空间 ${p.name}`} className="rounded p-2 hover:bg-slate-100" onClick={() => setRenaming({ id: p.id, name: p.name })}><Pencil size={14} /></button>
                  <button type="button" aria-label={`删除空间 ${p.name}`} title={partitions.length <= 1 ? '至少保留一个空间' : '删除空间'} disabled={partitions.length <= 1} className="rounded p-2 text-red-600 hover:bg-red-50 disabled:opacity-30" onClick={() => { setOpen(false); onDeletePartition(p.id) }}><Trash2 size={14} /></button>
                </>}
              </SortablePartitionRow>
            ))}
            </div>
            </SortableContext>
            </DndContext>
            <p className="text-xs text-slate-500">删除空间会移除其中的书签、文件夹和应用卡片，其他空间不受影响。</p>
          </section>
          <section hidden={section !== 'wallpaper'} className="space-y-3">
          <h3 className="text-base font-semibold">壁纸背景</h3>
          <p className="pb-2 text-xs font-medium text-slate-500">内置壁纸</p>
          <WallpaperPicker value={wallpaper} onChange={onWallpaper} />
          <p className="pt-3 pb-1 text-xs font-medium text-slate-500">自定义图片 URL</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const v = new FormData(e.currentTarget).get('wp')?.toString().trim()
              if (v) onWallpaper('custom:' + v)
            }}
            className="flex gap-1.5"
          >
            <input
              name="wp"
              placeholder="https://…/bg.jpg"
              className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-slate-400"
            />
            <button type="submit" className="h-8 rounded-md bg-slate-800 px-2.5 text-xs text-white hover:bg-slate-700">
              应用
            </button>
          </form>
          </section>
          <section hidden={section !== 'data'} className="space-y-3">
            <h3 className="text-base font-semibold">数据备份</h3>
            <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100" onClick={() => { setOpen(false); htmlInput.current?.click() }}><FileUp size={14} />导入浏览器书签 (HTML)</button>
            <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100" onClick={onExportJSON}><Download size={14} />导出备份 (JSON)</button>
            <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100" onClick={() => { setOpen(false); jsonInput.current?.click() }}><Upload size={14} />恢复备份 (JSON)</button>

          </section>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {previewType && <AppPreview key={previewType} type={previewType} onClose={() => setPreviewType(null)} onAdd={() => { onAddApp(previewType); setPreviewType(null) }} />}
      <input
        ref={htmlInput}
        type="file"
        accept=".html,.htm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onImportHTML(f)
          e.target.value = ''
        }}
      />
      <input
        ref={jsonInput}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onImportJSON(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
