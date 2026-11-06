import { useRef } from 'react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Image, Settings, Upload, Download, FileUp, Pencil, Check, LogOut, Cloud, CloudUpload } from 'lucide-react'
import { WALLPAPERS } from './Wallpaper'

interface Props {
  editMode: boolean
  onToggleEdit: () => void
  wallpaper: string
  onWallpaper: (id: string) => void
  onImportHTML: (file: File) => void
  onExportJSON: () => void
  onImportJSON: (file: File) => void
  accountLabel: string
  syncing: boolean
  onLogout: () => void
}

export function SettingsMenu({
  editMode, onToggleEdit, wallpaper, onWallpaper, onImportHTML, onExportJSON, onImportJSON,
  accountLabel, syncing, onLogout,
}: Props) {
  const htmlInput = useRef<HTMLInputElement>(null)
  const jsonInput = useRef<HTMLInputElement>(null)

  return (
    <div className="fixed right-4 top-4 z-20 flex items-center gap-2">
      {/* 换背景 */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 rounded-full bg-black/25 px-3.5 py-2 text-[13px] text-white/90 backdrop-blur-md border border-white/15 hover:bg-black/35 transition-colors">
            <Image size={14} />
            换背景
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 bg-white/95 backdrop-blur-xl">
          <p className="pb-2 text-xs font-medium text-slate-500">内置壁纸</p>
          <div className="grid grid-cols-3 gap-2">
            {WALLPAPERS.map((w) => (
              <button
                key={w.id}
                onClick={() => onWallpaper(w.id)}
                className={`relative h-14 overflow-hidden rounded-lg border-2 transition-colors ${
                  wallpaper === w.id ? 'border-slate-800' : 'border-transparent hover:border-slate-300'
                }`}
                style={{ background: w.sky }}
                title={w.name}
              >
                {w.mountains && (
                  <svg className="absolute bottom-0 left-0 w-full" style={{ height: '50%' }} viewBox="0 0 100 30" preserveAspectRatio="none">
                    <path fill={w.mountains[1]} d="M0,20 L20,8 L40,18 L60,6 L80,16 L100,10 L100,30 L0,30 Z" />
                  </svg>
                )}
                {wallpaper === w.id && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-white">
                    <Check size={10} />
                  </span>
                )}
              </button>
            ))}
          </div>
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
              className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-slate-400"
            />
            <button type="submit" className="h-8 rounded-md bg-slate-800 px-2.5 text-xs text-white hover:bg-slate-700">
              应用
            </button>
          </form>
        </PopoverContent>
      </Popover>

      {/* 设置 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 rounded-full bg-black/25 px-3.5 py-2 text-[13px] text-white/90 backdrop-blur-md border border-white/15 hover:bg-black/35 transition-colors">
            <Settings size={14} />
            设置
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <div className="px-2 py-1.5">
            <p className="truncate text-[13px] font-medium text-slate-700">{accountLabel}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              {syncing ? <CloudUpload size={11} /> : <Cloud size={11} />}
              {syncing ? '同步中…' : '已同步到云端'}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onToggleEdit}>
            {editMode ? <Check className="mr-2" size={14} /> : <Pencil className="mr-2" size={14} />}
            {editMode ? '完成编辑' : '编辑模式'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => htmlInput.current?.click()}>
            <FileUp className="mr-2" size={14} />
            导入浏览器书签 (HTML)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onExportJSON}>
            <Download className="mr-2" size={14} />
            导出备份 (JSON)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => jsonInput.current?.click()}>
            <Upload className="mr-2" size={14} />
            恢复备份 (JSON)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onLogout} className="text-red-600 focus:text-red-600">
            <LogOut className="mr-2" size={14} />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
