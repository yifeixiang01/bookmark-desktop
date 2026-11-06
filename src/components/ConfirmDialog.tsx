import { useEffect } from 'react'
import { Trash2 } from 'lucide-react'

export interface ConfirmConfig {
  title: string
  description?: string
  /** 标题上方的视觉元素（网站图标 / 文件夹预览 / 类型图标），缺省为垃圾桶 */
  icon?: React.ReactNode
  confirmText?: string
}

interface Props extends ConfirmConfig {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * 删除确认弹窗（桌面风格：深色磨砂玻璃 + 弹跳入场）。
 * 替代原生 window.confirm；Esc / 点背板取消。
 */
export function ConfirmDialog({
  open,
  title,
  description,
  icon,
  confirmText = '删除',
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="confirm-fade absolute inset-0 bg-black/45 backdrop-blur-sm" />
      <div
        role="alertdialog"
        aria-label={title}
        className="confirm-pop relative w-[320px] rounded-3xl border border-white/20 bg-slate-900/70 p-6 pt-7 shadow-2xl shadow-black/40 backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            {icon ?? (
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-500/20 text-red-300">
                <Trash2 size={26} />
              </div>
            )}
          </div>
          <h3 className="max-w-full truncate text-base font-medium text-white">{title}</h3>
          {description && (
            <p className="mt-1.5 max-w-full text-sm leading-relaxed text-white/60">{description}</p>
          )}
        </div>
        <div className="mt-6 flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full bg-white/12 py-2.5 text-sm text-white transition hover:bg-white/20 active:scale-95"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/25 transition hover:bg-red-400 active:scale-95"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
