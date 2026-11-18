import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  mobile?: boolean
  open: boolean
  title: string
  defaultValue?: string
  placeholder?: string
  onClose: () => void
  onConfirm: (value: string) => void
}

/** 通用的单字段命名弹窗：新建/重命名空间、分组共用 */
export function NamePromptDialog({ open, title, defaultValue = '', placeholder, onClose, onConfirm, mobile }: Props) {
  const [value, setValue] = useState(defaultValue)
  useEffect(() => {
    if (open) setValue(defaultValue)
  }, [open, defaultValue])

  const confirm = () => {
    if (!value.trim()) return
    onConfirm(value.trim())
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={`max-w-xs bg-white/95 backdrop-blur-xl ${mobile ? 'mobile-form-dialog' : ''}`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirm()}
          placeholder={placeholder}
        />
        <Button onClick={confirm} disabled={!value.trim()}>确定</Button>
      </DialogContent>
    </Dialog>
  )
}
