import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  title: string
  options: Array<{ id: string; label: string; hint?: string }>
  /** 提供则显示「新建」输入区，用户输入名称后确认 */
  allowNew?: { placeholder: string; button: string }
  onPick: (id: string) => void
  onPickNew?: (name: string) => void
  onClose: () => void
}

/** 通用选项弹窗：批量移动的「选择文件夹 / 选择分区」共用 */
export function OptionPickerDialog({ open, title, options, allowNew, onPick, onPickNew, onClose }: Props) {
  const [newName, setNewName] = useState('')
  useEffect(() => {
    if (open) setNewName('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xs bg-white/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto py-1">
          {options.length === 0 && <p className="py-4 text-center text-sm text-slate-400">暂无可选项</p>}
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => { onPick(o.id); onClose() }}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span>{o.label}</span>
              {o.hint && <span className="text-xs text-slate-400">{o.hint}</span>}
            </button>
          ))}
        </div>
        {allowNew && (
          <div className="flex gap-2 border-t border-slate-100 pt-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={allowNew.placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  onPickNew?.(newName.trim())
                  onClose()
                }
              }}
            />
            <Button
              disabled={!newName.trim()}
              onClick={() => { onPickNew?.(newName.trim()); onClose() }}
            >
              {allowNew.button}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
