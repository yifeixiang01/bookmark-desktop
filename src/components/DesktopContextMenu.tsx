import { useEffect, useRef } from 'react'
import { Check, Lock, LockOpen, Pencil, Plus, Sparkles } from 'lucide-react'
import type { IconSize } from '@/types/bookmark'
import { WALLPAPERS } from './Wallpaper'

interface Props {
  pos: { x: number; y: number } | null
  editMode: boolean
  locked: boolean
  iconSize: IconSize
  wallpaper: string
  onClose: () => void
  onAddBookmark: () => void
  onAddGroup: () => void
  onToggleEdit: () => void
  onToggleLocked: () => void
  onIconSize: (s: IconSize) => void
  onSortByColor: () => void
  onWallpaper: (id: string) => void
  onCustomWallpaper: () => void
}

const SIZES: Array<{ key: IconSize; label: string }> = [
  { key: 's', label: '小' },
  { key: 'm', label: '中' },
  { key: 'l', label: '大' },
]

/** 桌面空白处右键菜单 —— 相当于手机上的「双指捏合进桌面设置」 */
export function DesktopContextMenu(props: Props) {
  const { pos } = props
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pos) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') props.onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos])

  if (!pos) return null

  const W = 224
  const H = 400
  const left = Math.max(8, Math.min(pos.x, window.innerWidth - W - 8))
  const top = Math.max(8, Math.min(pos.y, window.innerHeight - H - 8))

  const item =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-100 transition-colors'
  const sep = <div className="mx-2 my-1 h-px bg-slate-200/80" />

  const act = (fn: () => void) => () => { fn(); props.onClose() }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={props.onClose} onContextMenu={(e) => { e.preventDefault(); props.onClose() }} />
      <div
        ref={ref}
        className="menu-pop fixed z-50 w-56 rounded-2xl border border-white/50 bg-white/90 p-1.5 shadow-2xl shadow-black/25 backdrop-blur-xl"
        style={{ left, top }}
      >
        <button className={item} onClick={act(props.onAddBookmark)}>
          <Plus size={14} className="text-slate-400" /> 添加书签
        </button>
        <button className={item} onClick={act(props.onAddGroup)}>
          <Plus size={14} className="text-slate-400" /> 新建文件夹
        </button>
        {sep}
        <button className={item} onClick={act(props.onToggleEdit)}>
          <Pencil size={14} className="text-slate-400" />
          {props.editMode ? '完成编辑' : '编辑模式'}
        </button>
        <button className={item} onClick={act(props.onToggleLocked)}>
          {props.locked ? <Lock size={14} className="text-slate-400" /> : <LockOpen size={14} className="text-slate-400" />}
          锁定布局
          {props.locked && <Check size={13} className="ml-auto text-slate-500" />}
        </button>
        <div className="flex items-center gap-2.5 px-3 py-2">
          <span className="text-[13px] text-slate-700">图标大小</span>
          <div className="ml-auto flex gap-1">
            {SIZES.map((s) => (
              <button
                key={s.key}
                onClick={() => props.onIconSize(s.key)}
                className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
                  props.iconSize === s.key
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <button className={item} onClick={act(props.onSortByColor)}>
          <Sparkles size={14} className="text-slate-400" /> 按颜色整理图标
        </button>
        {sep}
        <p className="px-3 pb-1 pt-1.5 text-[11px] text-slate-400">换背景</p>
        <div className="flex gap-1.5 px-3 pb-1.5">
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              title={w.name}
              onClick={() => props.onWallpaper(w.id)}
              className={`h-9 flex-1 overflow-hidden rounded-md border-2 transition-colors ${
                props.wallpaper === w.id ? 'border-slate-700' : 'border-transparent hover:border-slate-300'
              }`}
              style={{ background: w.sky }}
            >
              {w.mountains && (
                <svg className="mt-auto w-full" style={{ height: '45%' }} viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path fill={w.mountains[1]} d="M0,20 L20,8 L40,18 L60,6 L80,16 L100,10 L100,30 L0,30 Z" />
                </svg>
              )}
            </button>
          ))}
        </div>
        <button className={item} onClick={act(props.onCustomWallpaper)}>
          <span className="text-[13px]">自定义背景图…</span>
        </button>
      </div>
    </>
  )
}
