import { useEffect, useId } from 'react'
import { Trash2, X } from 'lucide-react'

export interface ConfirmConfig {
  title: string
  description?: string
  /** 标题上方的视觉元素（网站图标 / 文件夹预览 / 类型图标），缺省为垃圾桶 */
  icon?: React.ReactNode
  confirmText?: string
}

interface Props extends ConfirmConfig {
  children?: React.ReactNode
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * 浅色卡片确认弹窗，与桌面设置和编辑表单保持一致。
 * 替代原生 window.confirm；Esc / 点背板取消。
 */
export function ConfirmDialog({
  open,
  title,
  description,
  icon,
  confirmText = '删除',
  children,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId()
  const descriptionId = useId()
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
      <div className="confirm-fade absolute inset-0 bg-slate-950/30 backdrop-blur-sm" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="confirm-pop relative max-h-[calc(100dvh-2rem)] w-full max-w-[360px] overflow-y-auto rounded-[24px] border border-white/80 bg-[#fcfcfa] shadow-[0_24px_80px_-20px_rgba(15,23,42,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" aria-label="关闭确认弹窗" onClick={onCancel}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 motion-reduce:transition-none">
          <X size={17} />
        </button>
        <div className="px-6 pb-5 pt-6">
          <div className="mx-auto mb-4 w-fit">
            {icon ?? (
              <div className="grid h-14 w-14 place-items-center rounded-[18px] border border-rose-100 bg-rose-50 text-rose-500 shadow-[inset_0_1px_0_white]">
                <Trash2 size={25} strokeWidth={1.7} />
              </div>
            )}
          </div>
          <h3 id={titleId} className="break-words text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
          {description && (
            <p id={descriptionId} className="mt-2 break-words text-sm leading-6 text-slate-500">{description}</p>
          )}
          {children}
        </div>
        <div className="flex gap-3 border-t border-slate-200/70 bg-slate-50/80 px-6 py-4">
          <button
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 motion-reduce:transition-none"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="min-h-11 flex-1 rounded-xl border border-rose-600/10 bg-rose-500 px-4 py-2.5 text-sm font-medium text-white shadow-[0_3px_8px_rgba(244,63,94,0.16)] transition hover:bg-rose-600 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 motion-reduce:transition-none"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
