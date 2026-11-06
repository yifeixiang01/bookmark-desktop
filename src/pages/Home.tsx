import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Layers } from 'lucide-react'
import { useBookmarkStore } from '@/hooks/useBookmarkStore'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/providers/trpc'
import { useCloudSync } from '@/hooks/useCloudSync'
import { useDesktopDrag, SETTLE_MS, type GridFrame } from '@/hooks/useDesktopDrag'
import { FaviconImg } from '@/components/FaviconImg'
import { parseBookmarkHTML } from '@/lib/importBookmarks'
import { dragState } from '@/lib/dragState'
import { allBookmarks, exportJSON, parseStateJSON } from '@/lib/store'
import { ICON_PX, type Bookmark } from '@/types/bookmark'
import { Wallpaper } from '@/components/Wallpaper'
import { SearchBar } from '@/components/SearchBar'
import { PartitionSidebar } from '@/components/PartitionSidebar'
import { DesktopGrid } from '@/components/DesktopGrid'
import { FolderPanel } from '@/components/FolderPanel'
import { BookmarkFormDialog } from '@/components/BookmarkFormDialog'
import { NamePromptDialog } from '@/components/NamePromptDialog'
import { OptionPickerDialog } from '@/components/OptionPickerDialog'
import { ConfirmDialog, type ConfirmConfig } from '@/components/ConfirmDialog'
import { SettingsMenu } from '@/components/SettingsMenu'
import { DesktopContextMenu } from '@/components/DesktopContextMenu'
import { Dock } from '@/components/Dock'

type NamePrompt =
  | { kind: 'add-partition' }
  | { kind: 'rename-partition'; id: string }
  | { kind: 'rename-group'; id: string }
  | { kind: 'add-group' }
  | null

type Picker = { kind: 'folder' } | { kind: 'partition' } | null

export default function Home() {
  const { user, isLoading: authLoading, logout } = useAuth({ redirectOnUnauthenticated: true })
  const store = useBookmarkStore()
  const { state, activePartition } = store
  const cloud = useCloudSync(state, store.replaceState, !!user)

  const [editMode, setEditMode] = useState(false)
  const [openGroup, setOpenGroup] = useState<{ id: string; rect: DOMRect } | null>(null)
  const [prompt, setPrompt] = useState<NamePrompt>(null)
  const [picker, setPicker] = useState<Picker>(null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [bookmarkForm, setBookmarkForm] = useState<{
    open: boolean
    defaultGroupId?: string | null
    editing?: { groupId: string | null; bookmark: Bookmark } | null
  }>({ open: false })
  const [toast, setToast] = useState('')
  const [confirm, setConfirm] = useState<(ConfirmConfig & { action: () => void }) | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showToast = (msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2600)
  }

  const hostOf = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  }

  /** 书签图标（删除确认弹窗用） */
  const bookmarkIcon = (b: Bookmark, size = 56) => (
    <FaviconImg url={b.url} name={b.name} customIcon={b.icon} size={size} />
  )

  /** 文件夹迷你预览（删除确认弹窗用） */
  const folderIcon = (g: { bookmarks: Bookmark[] }) => (
    <div className="grid h-14 w-14 grid-cols-2 place-items-center gap-1 rounded-2xl border border-white/20 bg-white/10 p-1.5 backdrop-blur">
      {g.bookmarks.slice(0, 4).map((b) => (
        <FaviconImg key={b.id} url={b.url} name={b.name} customIcon={b.icon} size={20} className="rounded-md" />
      ))}
    </div>
  )

  // ---------- 桌面拖拽（自研指针拖拽：幽灵跟随指针，杜绝漂移） ----------
  const gridRef = useRef<GridFrame | null>(null)
  const panelElRef = useRef<HTMLDivElement | null>(null)
  /** 桌面横向滚动容器：整页不再纵向滚动，列表超宽时左右滑 */
  const desktopScrollRef = useRef<HTMLDivElement | null>(null)

  // 鼠标滚轮（纵向）→ 桌面横向滚动；触控板自带横向 deltaX 时不干预
  useEffect(() => {
    const el = desktopScrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      if (el.scrollWidth <= el.clientWidth) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  const iconPx = ICON_PX[state.iconSize] ?? ICON_PX.m

  // 后台重抓低清图标：旧数据存的 favicon.ico 多为 16/32px，放大显示模糊；
  // 逐个重新抓取（优先 apple-touch-icon / manifest 大图），拿到高清图就原位替换。
  // 注意等云端数据水合完成后再扫（否则读到的是本地种子数据）
  const utils = trpc.useUtils()
  const iconRefreshStarted = useRef(false)
  useEffect(() => {
    if (!cloud.hydrated || iconRefreshStarted.current || state.partitions.length === 0) return
    iconRefreshStarted.current = true
    const stale: Bookmark[] = []
    for (const p of state.partitions) {
      for (const it of p.items) {
        const list = it.kind === 'bookmark' ? [it.bookmark] : it.group.bookmarks
        for (const b of list) {
          if (/favicon\.ico(\?|#|$)/i.test(b.icon ?? '')) stale.push(b)
        }
      }
    }
    if (!stale.length) return
    let cancelled = false
    void (async () => {
      for (const b of stale.slice(0, 80)) {
        if (cancelled) return
        try {
          const info = await utils.siteMeta.fetchInfo.fetch({ url: b.url })
          if (!cancelled && info.ok && info.icon && !/favicon\.ico(\?|#|$)/i.test(info.icon)) {
            store.setBookmarkIcon(b.id, info.icon)
          }
        } catch {
          /* 单站失败不影响其余 */
        }
        await new Promise((r) => setTimeout(r, 300))
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloud.hydrated, state.partitions.length])

  const openGroupData = (() => {
    const it = activePartition.items.find(
      (x) => x.kind === 'group' && x.group.id === openGroup?.id
    )
    return it?.kind === 'group' ? it.group : null
  })()

  const { drag, press } = useDesktopDrag({
    gridRef,
    panelElRef,
    scrollRef: desktopScrollRef,
    locked: state.locked,
    onPlace: (source, cell) => {
      const rows = gridRef.current?.rows ?? 4
      if (source.kind === 'desktop-item') {
        store.placeItemAt(source.itemId, cell, rows)
      } else {
        store.moveBookmarkToDesktop(source.bookmarkId, cell)
        showToast('已移出到桌面')
      }
    },
    onMerge: (source, targetItemId) => {
      const target = activePartition.items.find((i) => i.id === targetItemId)
      if (!target) return
      if (source.kind === 'desktop-item') {
        const src = activePartition.items.find((i) => i.id === source.itemId)
        if (src?.kind !== 'bookmark') return
        if (target.kind === 'bookmark') {
          store.mergeBookmarks(src.bookmark.id, target.bookmark.id)
          showToast('已合并为文件夹')
        } else {
          store.addBookmarkToFolder(src.bookmark.id, target.group.id)
          showToast(`已加入「${target.group.name}」`)
        }
      } else if (target.kind === 'bookmark') {
        store.mergeFromFolder(source.bookmarkId, target.bookmark.id)
        showToast('已合并为文件夹')
      } else if (target.group.id !== source.groupId) {
        store.moveBookmarkToFolder(source.bookmarkId, target.group.id)
        showToast(`已移入「${target.group.name}」`)
      }
    },
    onDropIntoPanel: (source) => {
      if (source.kind !== 'desktop-item' || !openGroupData) return
      const src = activePartition.items.find((i) => i.id === source.itemId)
      if (src?.kind !== 'bookmark') return
      store.addBookmarkToFolder(src.bookmark.id, openGroupData.id)
      showToast(`已加入「${openGroupData.name}」`)
    },
  })

  const groups = activePartition.items.flatMap((it) => (it.kind === 'group' ? [it.group] : []))
  const totalBookmarks = useMemo(() => allBookmarks(activePartition).length, [activePartition])

  const dockItems = useMemo(
    () =>
      activePartition.dock
        .map((id) => store.findBookmark(id)?.bookmark)
        .filter((b): b is Bookmark => !!b),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePartition]
  )

  // 切分区 / 退出编辑模式时清空勾选
  useEffect(() => {
    setSelected(new Set())
    setOpenGroup(null)
  }, [state.activePartitionId])
  useEffect(() => {
    if (!editMode) setSelected(new Set())
  }, [editMode])

  // 拖拽时全局抓手光标
  useEffect(() => {
    document.body.style.cursor = drag ? 'grabbing' : ''
    return () => { document.body.style.cursor = '' }
  }, [drag])

  // 键盘：←/→ 切换分区，/ 聚焦搜索
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const idx = state.partitions.findIndex((p) => p.id === state.activePartitionId)
        const next = e.key === 'ArrowRight' ? idx + 1 : idx - 1
        if (next >= 0 && next < state.partitions.length) {
          store.setActivePartition(state.partitions[next].id)
        }
      } else if (e.key === '/') {
        e.preventDefault()
        document.getElementById('global-search-input')?.focus()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.partitions, state.activePartitionId])

  const toggleSelect = (bid: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(bid)) next.delete(bid)
      else next.add(bid)
      return next
    })

  // ---------- 命名弹窗分发 ----------
  const promptConfig = (() => {
    if (!prompt) return null
    switch (prompt.kind) {
      case 'add-partition':
        return { title: '新建分区', defaultValue: '', placeholder: '例如：办公、休闲、学习', onConfirm: (v: string) => store.addPartition(v) }
      case 'rename-partition': {
        const p = state.partitions.find((x) => x.id === prompt.id)
        return { title: '重命名分区', defaultValue: p?.name ?? '', onConfirm: (v: string) => store.renamePartition(prompt.id, v) }
      }
      case 'add-group':
        return { title: '新建文件夹', defaultValue: '', placeholder: '例如：开发工具', onConfirm: (v: string) => store.addGroup(v) }
      case 'rename-group': {
        const g = groups.find((x) => x.id === prompt.id)
        return { title: '重命名文件夹', defaultValue: g?.name ?? '', onConfirm: (v: string) => store.renameGroup(prompt.id, v) }
      }
    }
  })()

  const selectedIds = [...selected]

  // 拖拽中的桌面项目 id（用于面板的放入高亮判断；ternary 形式以获得 TS 类型收窄）
  const dragDesktopItemId = drag && drag.source.kind === 'desktop-item' ? drag.source.itemId : null
  const dragPanelBookmarkId = drag && drag.source.kind === 'panel-bookmark' ? drag.source.bookmarkId : null
  const dropPanelHighlight = !!(
    drag?.overPanel &&
    dragDesktopItemId &&
    activePartition.items.some((i) => i.id === dragDesktopItemId && i.kind === 'bookmark')
  )

  // 未登录会被 useAuth 重定向到 /login；已登录则等云端数据水合完成再渲染桌面
  if (authLoading || !user || !cloud.hydrated) {
    return (
      <div className="min-h-screen select-none font-sans">
        <Wallpaper id={state.wallpaper} />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4">
          {cloud.loadError ? (
            <>
              <p className="text-white/85">云端数据加载失败，请检查网络</p>
              <button
                onClick={() => cloud.retryLoad()}
                className="rounded-full bg-white/15 px-5 py-2 text-sm text-white backdrop-blur-md border border-white/20 hover:bg-white/25"
              >
                重试
              </button>
            </>
          ) : (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white" />
              <p className="text-sm text-white/70">正在同步云端数据…</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen select-none overflow-hidden font-sans">
      <Wallpaper id={state.wallpaper} />

      {/* 编辑模式下隐藏设置入口，换成显眼的「完成」按钮 */}
      {editMode && (
        <button
          onClick={() => setEditMode(false)}
          className="toast-in fixed right-4 top-4 z-30 flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-lg shadow-black/25 transition hover:bg-white/90 active:scale-95"
        >
          <Check size={16} strokeWidth={2.5} />
          完成
        </button>
      )}
      {!editMode && (
      <SettingsMenu
        editMode={editMode}
        onToggleEdit={() => setEditMode((v) => !v)}
        wallpaper={state.wallpaper}
        onWallpaper={store.setWallpaper}
        accountLabel={user.email ?? user.name ?? '已登录'}
        syncing={cloud.syncing}
        onLogout={logout}
        onExportJSON={() => exportJSON(state)}
        onImportHTML={async (file) => {
          const gs = parseBookmarkHTML(await file.text())
          if (!gs.length) showToast('没有解析到书签，请确认是浏览器导出的书签文件')
          else {
            store.importGroups(gs)
            showToast(`已导入 ${gs.length} 个文件夹到「${activePartition.name}」`)
          }
        }}
        onImportJSON={async (file) => {
          const parsed = parseStateJSON(await file.text())
          if (!parsed) showToast('备份文件无效')
          else {
            store.replaceState(parsed)
            showToast('已恢复备份')
          }
        }}
      />
      )}

      <PartitionSidebar
        partitions={state.partitions}
        activeId={activePartition.id}
        editMode={editMode}
        onSelect={store.setActivePartition}
        onAdd={() => setPrompt({ kind: 'add-partition' })}
        onRename={(id) => setPrompt({ kind: 'rename-partition', id })}
        onDelete={(id) => {
          const p = state.partitions.find((x) => x.id === id)
          if (p) {
            setConfirm({
              title: `删除分区「${p.name}」？`,
              description: '分区内的所有书签和文件夹会一起删除，此操作不可撤销。',
              icon: (
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/20 text-amber-300">
                  <Layers size={26} />
                </div>
              ),
              action: () => store.deletePartition(id),
            })
          }
        }}
      />

      {/* 主区域：整页固定一屏高，桌面列表在内容超宽时横向滚动 */}
      <main
        className="flex h-screen w-full flex-col pl-3 pr-[68px] sm:pl-6 sm:pr-24"
        onClickCapture={(e) => {
          // 文件夹面板打开时，点桌面空白处关闭（点图标/按钮/输入框不打扰；拖拽落点不触发）
          if (!openGroup || dragState.suppressClick) return
          const t = e.target as HTMLElement
          if (t.closest('.folder-pop') || t.closest('a,button,input')) return
          setOpenGroup(null)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          setCtxMenu({ x: e.clientX, y: e.clientY })
        }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-1 pt-[5vh] sm:px-0">
          <SearchBar engine={state.searchEngine} onEngineChange={store.setSearchEngine} />
          <p className="mt-3 text-sm text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            {activePartition.name} · {totalBookmarks} 个网站
            {state.locked && <span className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-xs">布局已锁定</span>}
            {editMode && <span className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-xs">编辑模式 · 点图标可勾选</span>}
          </p>
        </div>

        {/* 桌面横向滚动区：行数固定、列向右延伸；滚轮纵向滚动会被转为横向 */}
        <div
          ref={desktopScrollRef}
          className={`no-scrollbar relative mt-[2vh] w-full min-h-0 flex-1 overflow-x-auto overflow-y-hidden ${
            dockItems.length ? 'pb-24' : 'pb-4'
          }`}
        >
          {/* 切分区时重挂载播放入场过渡 */}
          <div key={activePartition.id} className="partition-enter h-full min-w-full">
            <DesktopGrid
              items={activePartition.items}
              editMode={editMode}
              locked={state.locked}
              iconPx={iconPx}
              dockIds={activePartition.dock}
              selected={selected}
              drag={drag}
              gridRef={gridRef}
              onPress={press}
              onToggleSelect={toggleSelect}
              onEditBookmark={(bid) => {
                const found = store.findBookmark(bid)
                if (found) {
                  setBookmarkForm({
                    open: true,
                    editing: { groupId: found.group?.id ?? null, bookmark: found.bookmark },
                  })
                }
              }}
              onDeleteBookmark={(item) => {
                setConfirm({
                  title: `删除「${item.bookmark.name}」？`,
                  description: hostOf(item.bookmark.url) || undefined,
                  icon: bookmarkIcon(item.bookmark),
                  action: () => store.deleteBookmark(item.bookmark.id),
                })
              }}
              onToggleDock={store.toggleDock}
              onOpenGroup={(id, rect) => setOpenGroup({ id, rect })}
              onRenameGroup={(id) => setPrompt({ kind: 'rename-group', id })}
              onDeleteGroup={(g) => {
                setConfirm({
                  title: `删除文件夹「${g.name}」？`,
                  description: `里面的 ${g.bookmarks.length} 个书签会一起删除，此操作不可撤销。`,
                  icon: folderIcon(g),
                  action: () => store.deleteGroup(g.id),
                })
              }}
              onAddClick={() =>
                editMode
                  ? setPrompt({ kind: 'add-group' })
                  : setBookmarkForm({ open: true, defaultGroupId: null })
              }
            />
          </div>

          {activePartition.items.length === 0 && (
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 rounded-2xl border border-white/15 bg-black/25 px-8 py-6 text-center backdrop-blur-md">
              <p className="text-white/90">「{activePartition.name}」还是空的</p>
              <p className="mt-1 text-sm text-white/60">
                点上方 + 添加书签，或在右上角「设置」里导入浏览器书签文件
              </p>
            </div>
          )}
        </div>
      </main>

      <Dock items={dockItems} editMode={editMode} iconPx={iconPx} onRemove={(id) => store.toggleDock(id)} />

      {/* 批量整理操作条 */}
      {editMode && selected.size > 0 && (
        <div className="toast-in fixed bottom-24 left-1/2 z-30 flex items-center gap-1 rounded-full bg-black/60 px-4 py-2 backdrop-blur-xl border border-white/15">
          <span className="px-1 text-sm text-white/85">已选 {selected.size} 项</span>
          <button
            className="rounded-full px-3 py-1.5 text-[13px] text-white hover:bg-white/15"
            onClick={() => setPicker({ kind: 'folder' })}
          >
            移入文件夹
          </button>
          {state.partitions.length > 1 && (
            <button
              className="rounded-full px-3 py-1.5 text-[13px] text-white hover:bg-white/15"
              onClick={() => setPicker({ kind: 'partition' })}
            >
              移到分区
            </button>
          )}
          <button
            className="rounded-full px-3 py-1.5 text-[13px] text-red-300 hover:bg-white/15"
            onClick={() => {
              setConfirm({
                title: `删除选中的 ${selected.size} 个书签？`,
                description: '这些书签将从桌面和所有文件夹中移除。',
                action: () => {
                  store.batchDelete(selectedIds)
                  setSelected(new Set())
                  showToast('已删除')
                },
              })
            }}
          >
            删除
          </button>
          <button
            className="rounded-full px-3 py-1.5 text-[13px] text-white/60 hover:bg-white/15"
            onClick={() => setSelected(new Set())}
          >
            取消
          </button>
        </div>
      )}

      {/* 桌面右键菜单 */}
      <DesktopContextMenu
        pos={ctxMenu}
        editMode={editMode}
        locked={state.locked}
        iconSize={state.iconSize}
        wallpaper={state.wallpaper}
        onClose={() => setCtxMenu(null)}
        onAddBookmark={() => setBookmarkForm({ open: true, defaultGroupId: null })}
        onAddGroup={() => setPrompt({ kind: 'add-group' })}
        onToggleEdit={() => setEditMode((v) => !v)}
        onToggleLocked={() => {
          store.toggleLocked()
          showToast(state.locked ? '已解锁布局' : '布局已锁定，拖拽已禁用')
        }}
        onIconSize={(s) => {
          store.setIconSize(s)
          showToast({ s: '已切换为小图标', m: '已切换为中图标', l: '已切换为大图标' }[s])
        }}
        onSortByColor={() => {
          store.sortByColor()
          showToast('已按颜色整理桌面图标')
        }}
        onWallpaper={store.setWallpaper}
        onCustomWallpaper={() => {
          const url = window.prompt('输入背景图片 URL')
          if (url?.trim()) store.setWallpaper('custom:' + url.trim())
        }}
      />

      {/* 文件夹原位展开面板 */}
      <FolderPanel
        group={openGroupData}
        anchor={openGroup?.rect ?? null}
        editMode={editMode}
        dockIds={activePartition.dock}
        dragBookmarkId={dragPanelBookmarkId}
        dropHighlight={dropPanelHighlight}
        panelRef={panelElRef}
        onPressBookmark={(e, bid) =>
          openGroupData && press(e, { kind: 'panel-bookmark', groupId: openGroupData.id, bookmarkId: bid })
        }
        onClose={() => setOpenGroup(null)}
        onRename={(id) => setPrompt({ kind: 'rename-group', id })}
        onAddBookmark={(gid) => setBookmarkForm({ open: true, defaultGroupId: gid })}
        onEditBookmark={(gid, bid) => {
          const found = store.findBookmark(bid)
          if (found) setBookmarkForm({ open: true, editing: { groupId: gid, bookmark: found.bookmark } })
        }}
        onDeleteBookmark={(bid) => {
          const found = store.findBookmark(bid)
          setConfirm({
            title: `删除「${found?.bookmark.name ?? '这个书签'}」？`,
            description: found ? hostOf(found.bookmark.url) || undefined : undefined,
            icon: found ? bookmarkIcon(found.bookmark) : undefined,
            action: () => store.deleteBookmark(bid),
          })
        }}
        onToggleDock={store.toggleDock}
        onMoveToDesktop={(bid) => {
          store.moveBookmarkToDesktop(bid)
          showToast('已移出到桌面')
        }}
      />

      <BookmarkFormDialog
        open={bookmarkForm.open}
        groups={groups}
        editing={bookmarkForm.editing}
        defaultGroupId={bookmarkForm.defaultGroupId}
        onClose={() => setBookmarkForm({ open: false })}
        onSave={(gid, bookmark, newGroupName) => {
          if (newGroupName) {
            store.saveBookmarkToNewGroup(newGroupName, bookmark)
          } else {
            store.saveBookmark(gid, bookmark)
          }
          showToast(`已保存「${bookmark.name}」`)
        }}
      />

      {/* 批量移动：目标选择 */}
      <OptionPickerDialog
        open={picker?.kind === 'folder'}
        title={`把 ${selected.size} 个书签移入文件夹`}
        options={groups.map((g) => ({ id: g.id, label: g.name, hint: `${g.bookmarks.length} 个` }))}
        allowNew={{ placeholder: '新文件夹名称', button: '新建并移入' }}
        onPick={(gid) => {
          store.batchMoveToFolder(selectedIds, gid)
          setSelected(new Set())
          showToast('已移入文件夹')
        }}
        onPickNew={(name) => {
          store.batchMoveToNewFolder(selectedIds, name)
          setSelected(new Set())
          showToast(`已移入新文件夹「${name}」`)
        }}
        onClose={() => setPicker(null)}
      />
      <OptionPickerDialog
        open={picker?.kind === 'partition'}
        title={`把 ${selected.size} 个书签移到分区`}
        options={state.partitions
          .filter((p) => p.id !== activePartition.id)
          .map((p) => ({ id: p.id, label: p.name }))}
        onPick={(pid) => {
          store.batchMoveToPartition(selectedIds, pid)
          setSelected(new Set())
          const p = state.partitions.find((x) => x.id === pid)
          showToast(`已移到「${p?.name ?? '分区'}」`)
        }}
        onClose={() => setPicker(null)}
      />

      {promptConfig && (
        <NamePromptDialog
          open={!!prompt}
          title={promptConfig.title}
          defaultValue={promptConfig.defaultValue}
          placeholder={'placeholder' in promptConfig ? promptConfig.placeholder : undefined}
          onClose={() => setPrompt(null)}
          onConfirm={promptConfig.onConfirm}
        />
      )}

      {/* 拖拽幻影：以指针为中心跟随；松手后飞向目标槽位（落点吸附），到位才提交 */}
      {drag &&
        (() => {
          const src = drag.source
          const settle = drag.settle
          let name = ''
          let icon: React.ReactNode = null
          if (src.kind === 'desktop-item') {
            const it = activePartition.items.find((i) => i.id === src.itemId)
            if (!it) return null
            if (it.kind === 'bookmark') {
              name = it.bookmark.name
              icon = (
                <FaviconImg url={it.bookmark.url} name={it.bookmark.name} customIcon={it.bookmark.icon} size={iconPx} />
              )
            } else {
              name = it.group.name
              const mini = Math.round(iconPx * 0.38)
              icon = (
                <div
                  className="grid grid-cols-2 place-items-center rounded-[24%] bg-white/85 shadow-lg backdrop-blur"
                  style={{ width: iconPx, height: iconPx }}
                >
                  {it.group.bookmarks.slice(0, 4).map((b) => (
                    <FaviconImg key={b.id} url={b.url} name={b.name} customIcon={b.icon} size={mini} />
                  ))}
                </div>
              )
            }
          } else {
            const found = store.findBookmark(src.bookmarkId)
            if (!found) return null
            name = found.bookmark.name
            icon = (
              <FaviconImg url={found.bookmark.url} name={found.bookmark.name} customIcon={found.bookmark.icon} size={iconPx} />
            )
          }
          const gScale = gridRef.current?.scale ?? 1
          return (
            <div
              className="pointer-events-none fixed z-[70] flex flex-col items-center gap-1.5"
              style={{
                left: settle ? settle.toX : drag.x,
                top: settle ? settle.toY : drag.y,
                transform: `translate(-50%, -80%) scale(${gScale * (settle ? settle.scale : 1)})`,
                opacity: settle?.fade ? 0 : 1,
                transition: settle
                  ? `left ${SETTLE_MS}ms cubic-bezier(.25,.8,.35,1), top ${SETTLE_MS}ms cubic-bezier(.25,.8,.35,1), transform ${SETTLE_MS}ms ease, opacity ${SETTLE_MS}ms ease`
                  : undefined,
              }}
            >
              <div className="ghost-pop drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">{icon}</div>
              <span className="max-w-24 truncate rounded bg-black/35 px-1.5 py-0.5 text-xs text-white backdrop-blur-sm">
                {name}
              </span>
            </div>
          )
        })()}

      {/* 删除确认弹窗（替代原生 confirm） */}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ''}
        description={confirm?.description}
        icon={confirm?.icon}
        confirmText={confirm?.confirmText}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.action()
          setConfirm(null)
        }}
      />

      {/* 轻提示 */}
      {toast && (
        <div className="toast-in fixed bottom-40 left-1/2 z-50 rounded-full bg-black/70 px-5 py-2 text-sm text-white backdrop-blur-md">
          {toast}
        </div>
      )}
    </div>
  )
}
