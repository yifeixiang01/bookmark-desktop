import { useEffect, useRef, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Bookmark, Group } from '@/types/bookmark'
import { uid } from '@/lib/store'
import { trpc } from '@/providers/trpc'
import { FaviconImg } from './FaviconImg'

interface Props {
  open: boolean
  groups: Group[]
  /** 编辑已有书签时传入；groupId 为 null 表示桌面独立书签 */
  editing?: { groupId: string | null; bookmark: Bookmark } | null
  /** 默认选中的分组（从某个文件夹里点「添加」时）；null 表示桌面 */
  defaultGroupId?: string | null
  onClose: () => void
  onSave: (groupId: string | null, bookmark: Bookmark, newGroupName?: string) => void
}

const NEW_GROUP = '__new__'
const DESKTOP = '__desktop__'

type FetchState = 'idle' | 'loading' | 'done' | 'fail'

/** 站点标题常带副标题（"知乎 - 有问题，就会有答案"），取首段短名做图标标签 */
function shortLabel(title: string): string {
  const first = title.split(/\s[-–—|]\s/)[0]?.trim() ?? ''
  return first && first.length <= 12 ? first : title
}

export function BookmarkFormDialog({ open, groups, editing, defaultGroupId, onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [icon, setIcon] = useState('')
  const [description, setDescription] = useState('')
  const [groupId, setGroupId] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [fetchState, setFetchState] = useState<FetchState>('idle')
  const [saving, setSaving] = useState(false)

  // 用户手动改过的字段不被自动填充覆盖
  const touched = useRef({ name: false, desc: false, icon: false })
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fetchSeq = useRef(0)
  const utils = trpc.useUtils()

  useEffect(() => {
    if (!open) return
    setName(editing?.bookmark.name ?? '')
    setUrl(editing?.bookmark.url ?? '')
    setIcon(editing?.bookmark.icon ?? '')
    setDescription(editing?.bookmark.description ?? '')
    setNewGroupName('')
    setFetchState('idle')
    setSaving(false)
    touched.current = { name: false, desc: false, icon: false }
    if (editing) setGroupId(editing.groupId ?? DESKTOP)
    else if (defaultGroupId !== undefined) setGroupId(defaultGroupId ?? DESKTOP)
    else setGroupId(DESKTOP)
  }, [open, editing, defaultGroupId, groups])

  const normalizedUrl = (() => {
    let u = url.trim()
    if (u && !/^https?:\/\//.test(u)) u = 'https://' + u
    return u
  })()
  const urlValid = /^https?:\/\/.+\..+/.test(normalizedUrl)

  /** 输入网址后停顿 800ms 自动抓取网站信息，只填充用户没动过的字段 */
  const onUrlChange = (v: string) => {
    setUrl(v)
    clearTimeout(debounceTimer.current)
    const u = v.trim()
    const full = u && !/^https?:\/\//.test(u) ? 'https://' + u : u
    if (!/^https?:\/\/.+\..+/.test(full)) {
      setFetchState('idle')
      return
    }
    // 编辑模式且网址没变回原始值时不重复抓
    if (editing && full === editing.bookmark.url) return
    setFetchState('loading')
    const seq = ++fetchSeq.current
    debounceTimer.current = setTimeout(async () => {
      try {
        const info = await utils.siteMeta.fetchInfo.fetch({ url: full })
        if (seq !== fetchSeq.current) return // 已有更新的请求
        if (info.ok && (info.name || info.description || info.icon)) {
          if (!touched.current.name && info.name) setName(shortLabel(info.name))
          if (!touched.current.desc && info.description) setDescription(info.description)
          if (!touched.current.icon && info.icon) setIcon(info.icon)
          setFetchState('done')
        } else {
          setFetchState('fail')
        }
      } catch {
        if (seq === fetchSeq.current) setFetchState('fail')
      }
    }, 800)
  }

  const canSave =
    name.trim() !== '' &&
    urlValid &&
    (groupId !== NEW_GROUP || newGroupName.trim() !== '')

  /**
   * 保存。若图标还没抓到（用户在 800ms 防抖完成前就点了保存），
   * 先同步抓一次网站信息再落库，保证图标随书签一起保存。
   */
  const handleSave = async () => {
    let finalName = name.trim()
    let finalIcon = icon.trim()
    let finalDesc = description.trim()

    if (!finalIcon && !touched.current.icon) {
      clearTimeout(debounceTimer.current)
      setSaving(true)
      try {
        const info = await utils.siteMeta.fetchInfo.fetch({ url: normalizedUrl })
        if (info.ok) {
          if (info.icon) finalIcon = info.icon
          if (!touched.current.name && !finalName && info.name) finalName = shortLabel(info.name)
          if (!touched.current.desc && !finalDesc && info.description) finalDesc = info.description
        }
      } catch {
        /* 抓取失败则走下面的 /favicon.ico 兜底 */
      }
      if (!finalIcon) {
        try {
          finalIcon = new URL('/favicon.ico', normalizedUrl).toString()
        } catch {
          /* ignore */
        }
      }
      setSaving(false)
    }

    onSave(
      groupId === DESKTOP ? null : groupId,
      {
        id: editing?.bookmark.id ?? uid(),
        name: finalName,
        url: normalizedUrl,
        icon: finalIcon || undefined,
        description: finalDesc || undefined,
      },
      groupId === NEW_GROUP ? newGroupName.trim() : undefined
    )
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-white/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑书签' : '添加书签'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <div className="flex items-start gap-4">
            <div className="relative pt-5">
              <FaviconImg url={normalizedUrl || 'https://example.com'} name={name || '?'} customIcon={icon || undefined} size={52} />
              {fetchState === 'loading' && (
                <span className="absolute inset-0 pt-5 grid place-items-center">
                  <Loader2 size={20} className="animate-spin rounded-xl bg-white/70 p-0.5 text-slate-500" />
                </span>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <div>
                <Label htmlFor="bm-url">网址</Label>
                <Input
                  id="bm-url"
                  value={url}
                  onChange={(e) => onUrlChange(e.target.value)}
                  placeholder="github.com"
                  autoFocus
                />
                <p className={`mt-1 flex items-center gap-1 text-[11px] transition-opacity ${
                  fetchState === 'idle' ? 'opacity-0' : 'opacity-100'
                } ${fetchState === 'fail' ? 'text-amber-500' : 'text-slate-400'}`}>
                  {fetchState === 'loading' && '正在获取网站信息…'}
                  {fetchState === 'done' && (<><Sparkles size={11} className="text-sky-500" />已自动填充，可随意修改</>)}
                  {fetchState === 'fail' && '没能自动获取，手动填写即可'}
                  {fetchState === 'idle' && '占位'}
                </p>
              </div>
              <div>
                <Label htmlFor="bm-name">名称</Label>
                <Input
                  id="bm-name"
                  value={name}
                  onChange={(e) => { touched.current.name = true; setName(e.target.value) }}
                  placeholder="例如：GitHub"
                />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="bm-desc">描述（可选，鼠标悬停图标时显示）</Label>
            <Textarea
              id="bm-desc"
              value={description}
              onChange={(e) => { touched.current.desc = true; setDescription(e.target.value) }}
              placeholder="一句话介绍这个网站，例如：全球最大代码托管平台"
              rows={2}
              maxLength={200}
              className="resize-none"
            />
          </div>
          <div>
            <Label htmlFor="bm-icon">自定义图标 URL（可选，留空自动抓取）</Label>
            <Input
              id="bm-icon"
              value={icon}
              onChange={(e) => { touched.current.icon = true; setIcon(e.target.value) }}
              placeholder="https://…/icon.png"
            />
          </div>
          <div>
            <Label>放在哪里</Label>
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              <button
                onClick={() => setGroupId(DESKTOP)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  groupId === DESKTOP
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                桌面（独立图标）
              </button>
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGroupId(g.id)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    groupId === g.id
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {g.name}
                </button>
              ))}
              <button
                onClick={() => setGroupId(NEW_GROUP)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  groupId === NEW_GROUP
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                + 新文件夹
              </button>
            </div>
            {groupId === NEW_GROUP && (
              <Input
                className="mt-2"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="新文件夹名称，例如：开发工具"
              />
            )}
          </div>
          <Button disabled={!canSave || saving} onClick={() => void handleSave()}>
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={15} className="animate-spin" />
                正在抓取网站图标…
              </span>
            ) : (
              '保存'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
