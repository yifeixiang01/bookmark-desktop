import { FolderTile } from '@/components/FolderTile'
import { AppTile } from '@/apps/AppTile'
import { AnimatedDragPreview } from '@/components/AnimatedDragPreview'
import { appName } from '@/apps'
import type { AppType } from '@/types/bookmark'
import { dragVisualOf } from '@/lib/gridLayout'
import { BookmarkSpaceDialog } from '@/components/BookmarkSpaceDialog'
import { containingPartitions } from '@/lib/bookmarkActions'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Layers, Expand } from 'lucide-react'
import { useBookmarkStore } from '@/hooks/useBookmarkStore'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/providers/trpc'
import { useCloudSync } from '@/hooks/useCloudSync'
import { useSyncedLogout } from '@/hooks/useSyncedLogout'
import { useAppFont } from '@/hooks/useAppFont'
import { useDesktopDrag, SETTLE_MS, type GridFrame } from '@/hooks/useDesktopDrag'
import { FaviconImg } from '@/components/FaviconImg'
import { parseBookmarkHTML } from '@/lib/importBookmarks'
import { dragState } from '@/lib/dragState'
import { exportJSON, parseStateJSON } from '@/lib/store'
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

type NamePrompt =
  | { kind: 'add-partition' }
  | { kind: 'rename-partition'; id: string }
  | { kind: 'rename-group'; id: string }
  | { kind: 'add-group' }
  | null

export default function Home() {
  const { user, isLoading: authLoading, isLoggingOut, logout } = useAuth({ redirectOnUnauthenticated: true })
  const store = useBookmarkStore()
  const { state, activePartition } = store
  useAppFont(state.font, state.fontScale)
  const cloud = useCloudSync(state, store.replaceState, user?.id)
  const [logoutError, setLogoutError] = useState('')
  const { exiting, exit } = useSyncedLogout(cloud.flushPending, logout, setLogoutError)

  const { finishApps } = store
  useEffect(() => {
    if (!cloud.hydrated || exiting) return
    finishApps()
    const timer = window.setInterval(finishApps, 1000)
    window.addEventListener('focus', finishApps)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', finishApps) }
  }, [cloud.hydrated, finishApps, exiting])

  const [editingGroup, setEditingGroup] = useState<{ id: string; value: string } | null>(null)
  const [movingGroup, setMovingGroup] = useState<string | null>(null)
  const [movingBookmark, setMovingBookmark] = useState<string | null>(null)
  const [spaceAction, setSpaceAction] = useState<{ mode: 'copy' | 'delete'; bookmark: Bookmark; sourceId: string } | null>(null)
  const [openGroup, setOpenGroup] = useState<{ id: string; rect: DOMRect } | null>(null)
  const [prompt, setPrompt] = useState<NamePrompt>(null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)
  const [bookmarkForm, setBookmarkForm] = useState<{
    open: boolean
    defaultGroupId?: string | null
    editing?: { groupId: string | null; bookmark: Bookmark } | null
  }>({ open: false })
  const [toast, setToast] = useState('')
  const [spaceNavigationKey, setSpaceNavigationKey] = useState(0)
  const [confirm, setConfirm] = useState<(ConfirmConfig & { action: () => void }) | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2600)
  }, [])

  const createFolder = () => {
    const id = store.addGroup('新建文件夹')
    setEditingGroup({ id, value: '新建文件夹' })
  }
  const editFolderName = (id: string) => {
    const item = activePartition.items.find((it) => it.kind === 'group' && it.group.id === id)
    if (item?.kind !== 'group') return
    setOpenGroup(null)
    setEditingGroup({ id, value: item.group.name })
  }
  const confirmFolderName = () => {
    if (!editingGroup) return
    store.renameGroup(editingGroup.id, editingGroup.value.trim() || '新建文件夹')
    setEditingGroup(null)
  }

  const runningAppIds = useRef(new Set<string>())
  const dueWaterIds = useRef(new Set<string>())
  useEffect(() => {
    const running = new Set<string>()
    let finished = false
    let waterDue = false
    const due = new Set<string>()
    for (const p of state.partitions) for (const it of p.items) {
      if (it.kind !== 'app') continue
      if (it.app.type === 'water' && it.app.due) {
        due.add(it.id)
        if (!dueWaterIds.current.has(it.id)) waterDue = true
      }
      if (it.app.type !== 'pomodoro') continue
      if (it.app.endsAt !== null) running.add(it.id)
      else if (it.app.finished && runningAppIds.current.has(it.id)) finished = true
    }
    runningAppIds.current = running
    dueWaterIds.current = due
    if (finished || waterDue) showToast([finished ? '番茄钟本轮已结束，记得休息' : '', waterDue ? '该喝水啦，给自己补充水分' : ''].filter(Boolean).join(' · '))
  }, [state.partitions, showToast])

  const openMoveBookmark = (id: string) => {
    if (state.partitions.length < 2) { showToast('没有其他空间，请先创建'); return }
    setMovingBookmark(id)
  }

  const openSpaceAction = (id: string, mode: 'copy' | 'delete') => {
    if (mode === 'copy' && state.partitions.length < 2) {
      showToast('没有其他空间，请先创建')
      return
    }
    const found = store.findBookmark(id)
    if (found) setSpaceAction({ mode, bookmark: found.bookmark, sourceId: activePartition.id })
  }

  /** 文件夹迷你预览（删除确认弹窗用） */
  const folderIcon = (g: { bookmarks: Bookmark[] }) => (
    <div className="grid h-16 w-16 grid-cols-2 place-items-center gap-1 rounded-[18px] border-2 border-slate-300 bg-slate-100 p-2 shadow-sm">
      {g.bookmarks.slice(0, 4).map((b) => (
        <FaviconImg key={b.id} url={b.url} name={b.name} customIcon={b.icon} size={20} className="rounded-md" />
      ))}
    </div>
  )

  // ---------- 桌面拖拽（自研指针拖拽：幽灵跟随指针，杜绝漂移） ----------
  const gridRef = useRef<GridFrame | null>(null)
  const panelElRef = useRef<HTMLDivElement | null>(null)
  /** 桌面分页容器：由 DesktopGrid 控制整页吸附与圆点导航。 */
  const desktopScrollRef = useRef<HTMLDivElement | null>(null)

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
        const list = it.kind === 'bookmark' ? [it.bookmark] : it.kind === 'group' ? it.group.bookmarks : []
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
      const pageCols = gridRef.current?.pageCols
      if (source.kind === 'desktop-item') {
        store.placeItemAt(source.itemId, cell, rows, pageCols)
      } else {
        store.moveBookmarkToDesktop(source.bookmarkId, cell)
        showToast('已移出到桌面')
      }
    },
    onMerge: (source, targetItemId) => {
      const target = activePartition.items.find((i) => i.id === targetItemId)
      if (!target || target.kind === 'app') return
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

  const groups = useMemo(() => activePartition.items.flatMap((it) => (it.kind === 'group' ? [it.group] : [])), [activePartition.items])

  // 切空间时关闭文件夹面板
  useEffect(() => {
    setOpenGroup(null)
  }, [state.activePartitionId])
  // 拖拽时全局抓手光标
  useEffect(() => {
    document.body.style.cursor = drag ? 'grabbing' : ''
    return () => { document.body.style.cursor = '' }
  }, [drag])

  // 桌面空闲态快捷键：↑/↓ 切换空间，←/→ 切换分页，/ 聚焦搜索。
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const busy = !!openGroup || !!prompt || !!ctxMenu || bookmarkForm.open ||
        !!confirm || !!movingGroup || !!movingBookmark || !!spaceAction ||
        !!document.querySelector('[role="dialog"],[role="menu"]')
      if (busy) return

      // Desktop arrow shortcuts leave unrelated buttons behind. Release their
      // focus so the next key cannot leave a ring on an old settings/page button.
      // Space navigation manages its own focus; inputs and dialogs are excluded above.
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) &&
        t instanceof HTMLButtonElement && !t.closest('nav[aria-label="切换空间"]')) {
        t.blur()
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        setSpaceNavigationKey((key) => key + 1)
        const idx = state.partitions.findIndex((p) => p.id === state.activePartitionId)
        const next = e.key === 'ArrowDown' ? idx + 1 : idx - 1
        if (next >= 0 && next < state.partitions.length) {
          store.setActivePartition(state.partitions[next].id)
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const el = desktopScrollRef.current
        if (!el) return
        e.preventDefault()
        const current = Math.round(el.scrollLeft / el.clientWidth)
        const next = current + (e.key === 'ArrowRight' ? 1 : -1)
        el.scrollTo({ left: Math.max(0, next) * el.clientWidth, behavior: 'smooth' })
      } else if (e.key === '/') {
        e.preventDefault()
        document.getElementById('global-search-input')?.focus()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.partitions, state.activePartitionId, openGroup, prompt,
    ctxMenu, bookmarkForm.open, confirm, movingGroup, movingBookmark, spaceAction, store,
  ])

  // ---------- 命名弹窗分发 ----------
  const promptConfig = (() => {
    if (!prompt) return null
    switch (prompt.kind) {
      case 'add-partition':
        return { title: '新建空间', defaultValue: '', placeholder: '例如：办公、休闲、学习', onConfirm: (v: string) => store.addPartition(v) }
      case 'rename-partition': {
        const p = state.partitions.find((x) => x.id === prompt.id)
        return { title: '重命名空间', defaultValue: p?.name ?? '', onConfirm: (v: string) => store.renamePartition(prompt.id, v) }
      }
      case 'add-group':
        return { title: '新建文件夹', defaultValue: '', placeholder: '例如：开发工具', onConfirm: (v: string) => store.addGroup(v) }
      case 'rename-group': {
        const g = groups.find((x) => x.id === prompt.id)
        return { title: '重命名文件夹', defaultValue: g?.name ?? '', onConfirm: (v: string) => store.renameGroup(prompt.id, v) }
      }
    }
  })()

  // 拖拽中的桌面项目 id（用于面板的放入高亮判断；ternary 形式以获得 TS 类型收窄）
  const dragDesktopItemId = drag && drag.source.kind === 'desktop-item' ? drag.source.itemId : null
  const dragPanelBookmarkId = drag && drag.source.kind === 'panel-bookmark' ? drag.source.bookmarkId : null
  const dropPanelHighlight = !!(
    drag?.overPanel &&
    dragDesktopItemId &&
    activePartition.items.some((i) => i.id === dragDesktopItemId && i.kind === 'bookmark')
  )

  // 未登录会被 useAuth 重定向到 /login；已登录则等云端数据水合完成再渲染桌面
  if (exiting || authLoading || !user || !cloud.hydrated) {
    return (
      <div className="min-h-screen select-none font-sans">
        <Wallpaper id={state.wallpaper} />
      {cloud.error && <div role="alert" className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] left-1/2 z-50 w-[min(90vw,650px)] -translate-x-1/2 rounded-xl bg-amber-100 p-4 text-sm text-amber-950 shadow-xl">
        <p>{cloud.error}</p><button className="mt-2 underline" onClick={() => exportJSON(state)}>导出本地备份</button>
      </div>}
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
              <p role="status" className="text-sm text-white/70">{exiting || isLoggingOut ? '正在退出登录…' : '正在同步云端数据…'}</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen select-none overflow-hidden font-sans">
      {logoutError && <div role="alert" className="fixed left-1/2 top-4 z-[100] w-max max-w-[90vw] -translate-x-1/2 rounded-xl bg-amber-100 px-5 py-3 text-sm text-amber-950">{logoutError}</div>}
      <Wallpaper id={state.wallpaper} />
      {state.locked && (
        <span role="status" className="fixed right-[104px] top-4 z-20 rounded-full border border-white/15 bg-black/25 px-3 py-2 text-[13px] text-white/90 backdrop-blur-md">
          布局已锁定
        </span>
      )}

      <SettingsMenu
        currentPartitionName={activePartition.name}
        appCounts={activePartition.items.reduce<Partial<Record<AppType, number>>>((counts, it) => { if (it.kind === 'app') counts[it.app.type] = (counts[it.app.type] ?? 0) + 1; return counts }, {})}
        onAddApp={(type) => { store.addApp(type); showToast(`已添加${appName(type)}到「${activePartition.name}」`) }}
        partitions={state.partitions}
        onAddPartition={store.addPartition}
        onRenamePartition={store.renamePartition}
        onReorderPartitions={store.reorderPartitions}
        onDeletePartition={(id) => {
          const p = state.partitions.find((x) => x.id === id)
          if (p) {
            setConfirm({
              title: `删除空间「${p.name}」？`,
              description: '空间内的所有书签、文件夹和应用卡片会一起删除，此操作不可撤销。',
              icon: (
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/20 text-amber-300">
                  <Layers size={26} />
                </div>
              ),
              action: () => store.deletePartition(id),
            })
          }
        }}
        wallpaper={state.wallpaper}
        font={state.font ?? 'system'}
        onFont={store.setFont}
        fontScale={state.fontScale ?? 100}
        onFontScale={store.setFontScale}
        onWallpaper={store.setWallpaper}
        accountLabel={user.email ?? user.name ?? '已登录'}
        syncing={cloud.syncing}
        syncError={logoutError || cloud.error}
        onLogout={() => { setLogoutError(''); void exit() }}
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

      <PartitionSidebar
        revealKey={spaceNavigationKey}
        partitions={state.partitions}
        activeId={activePartition.id}
        onSelect={store.setActivePartition}
      />

      {/* 主区域：整页固定一屏高，桌面列表在内容超宽时横向滚动 */}
      <main
        data-wallpaper-surface
        data-wallpaper-tone={['bookmark-islands', 'kite-meadow'].includes(state.wallpaper) ? 'light' : undefined}
        className="flex h-screen w-full flex-col px-3 sm:px-6"
        onClickCapture={(e) => {
          // 文件夹面板打开时，点桌面空白处关闭（点图标/按钮/输入框不打扰；拖拽落点不触发）
          if (!openGroup || dragState.suppressClick) return
          const t = e.target as HTMLElement
          if (t.closest('.folder-pop') || t.closest('a,button,input,[role=menu]')) return
          setOpenGroup(null)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          setCtxMenu({ x: e.clientX, y: e.clientY })
        }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-1 pt-[5vh] sm:px-0">
          <SearchBar partitions={state.partitions} engine={state.searchEngine} onEngineChange={store.setSearchEngine} />
        </div>

        {/* 响应式分页桌面：每页容量固定，超出后整页翻动并显示页码圆点。 */}
        <div className="relative mt-[2vh] min-h-0 w-full flex-1 overflow-hidden">
          {/* 切空间时重挂载播放入场过渡 */}
          <div key={activePartition.id} className="partition-enter h-full min-w-full">
            <DesktopGrid
              onAppAction={store.appAction}
              noteHistory={activePartition.noteHistory}
              onDeleteApp={(id) => {
                const item = activePartition.items.find((it) => it.id === id)
                if (item?.kind === 'app') setConfirm({ title: `移除${appName(item.app.type)}？`, description: item.app.type === 'note' ? '仅移除这张卡片及未归档的内容。当前空间的便签历史会保留，重新添加便签后仍可查看。' : '这张卡片的内容和记录会一起移除。其他卡片不受影响。', action: () => store.removeApp(id) })
              }}
              items={activePartition.items}
              editMode={false}
              locked={state.locked}
              iconPx={iconPx}
              selected={new Set()}
              drag={drag}
              gridRef={gridRef}
              scrollRef={desktopScrollRef}
              onPress={press}
              onToggleSelect={() => {}}
              onEditBookmark={(bid) => {
                const found = store.findBookmark(bid)
                if (found) {
                  setBookmarkForm({
                    open: true,
                    editing: { groupId: found.group?.id ?? null, bookmark: found.bookmark },
                  })
                }
              }}
              onMoveBookmark={openMoveBookmark}
        onCopyBookmark={(id) => openSpaceAction(id, 'copy')}
              onDeleteBookmark={(item) => openSpaceAction(item.bookmark.id, 'delete')}
              onOpenGroup={(id, rect) => setOpenGroup({ id, rect })}
              onRenameGroup={editFolderName}
              editingGroup={editingGroup}
              onGroupNameChange={(value) => setEditingGroup((current) => current ? { ...current, value } : null)}
              onConfirmGroupName={confirmFolderName}
              onCancelGroupName={() => setEditingGroup(null)}
              onMoveGroup={(id) => {
                if (state.partitions.length < 2) { showToast('没有其他空间，请先创建'); return }
                setMovingGroup(id)
              }}
              onDissolveGroup={(id) => {
                const group = activePartition.items.find((it) => it.kind === 'group' && it.group.id === id)
                if (group?.kind === 'group') setConfirm({
                  title: `解散文件夹「${group.group.name}」？`,
                  description: '解散后，文件夹中的书签将移到当前桌面，书签不会被删除。',
                  icon: (
                    <div className="grid h-14 w-14 place-items-center rounded-[18px] border border-sky-100 bg-sky-50 text-sky-600 shadow-[inset_0_1px_0_white]">
                      <Expand size={25} strokeWidth={1.7} aria-hidden="true" />
                    </div>
                  ),
                  confirmText: '解散',
                  action: () => store.dissolveGroup(id),
                })
              }}
              onDeleteGroup={(g) => {
                if (g.bookmarks.length === 0) {
                  store.deleteGroup(g.id, gridRef.current?.rows, gridRef.current?.pageCols)
                  return
                }
                setConfirm({
                  title: `删除文件夹「${g.name}」？`,
                  description: `里面的 ${g.bookmarks.length} 个书签会一起删除，此操作不可撤销。`,
                  icon: folderIcon(g),
                  action: () => store.deleteGroup(g.id, gridRef.current?.rows, gridRef.current?.pageCols),
                })
              }}
              onAddClick={createFolder}
            />
          </div>

          {activePartition.items.length === 0 && (
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 rounded-2xl border border-white/15 bg-black/25 px-8 py-6 text-center backdrop-blur-md">
              <p className="text-white/90">「{activePartition.name}」还是空的</p>
              <p className="mt-1 text-sm text-white/60">
                右键桌面添加书签，或在右上角「设置」里导入浏览器书签文件
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 桌面右键菜单 */}
      <DesktopContextMenu
        pos={ctxMenu}
        locked={state.locked}
        iconSize={state.iconSize}
        onClose={() => setCtxMenu(null)}
        onAddBookmark={() => setBookmarkForm({ open: true, defaultGroupId: null })}
        onAddGroup={createFolder}
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
      />

      {/* 文件夹原位展开面板 */}
      <FolderPanel
        group={openGroupData}
        anchor={openGroup?.rect ?? null}
        editMode={false}
        dragBookmarkId={dragPanelBookmarkId}
        dropHighlight={dropPanelHighlight}
        panelRef={panelElRef}
        onPressBookmark={(e, bid) =>
          openGroupData && press(e, { kind: 'panel-bookmark', groupId: openGroupData.id, bookmarkId: bid })
        }
        onClose={() => setOpenGroup(null)}
        onRename={editFolderName}
        onAddBookmark={(gid) => setBookmarkForm({ open: true, defaultGroupId: gid })}
        onEditBookmark={(gid, bid) => {
          const found = store.findBookmark(bid)
          if (found) setBookmarkForm({ open: true, editing: { groupId: gid, bookmark: found.bookmark } })
        }}
        onMoveBookmark={openMoveBookmark}
        onCopyBookmark={(id) => openSpaceAction(id, 'copy')}
        onDeleteBookmark={(id) => openSpaceAction(id, 'delete')}
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
          const synced = !!bookmarkForm.editing && containingPartitions(state, bookmarkForm.editing.bookmark).some((p) => p.id !== activePartition.id)
          if (newGroupName) {
            store.saveBookmarkToNewGroup(newGroupName, bookmark)
          } else {
            store.saveBookmark(gid, bookmark)
          }
          showToast(synced ? '已同步其他空间' : `已保存「${bookmark.name}」`)
        }}
      />

      <OptionPickerDialog
        open={movingGroup !== null}
        title="移动卡片到其他空间"
        options={state.partitions.filter((p) => p.id !== activePartition.id).map((p) => ({ id: p.id, label: p.name }))}
        onPick={(id) => {
          if (movingGroup) store.moveGroupToPartition(movingGroup, id)
          setMovingGroup(null)
          setOpenGroup(null)
          showToast('卡片已移动，目标空间的重复书签已合并到卡片内')
        }}
        onClose={() => setMovingGroup(null)}
      />
      <OptionPickerDialog
        open={movingBookmark !== null}
        title="移动到其他空间"
        options={state.partitions.filter((p) => p.id !== activePartition.id).map((p) => ({ id: p.id, label: p.name }))}
        onPick={(id) => {
          if (movingBookmark) store.moveBookmarkToPartition(movingBookmark, id)
          setMovingBookmark(null)
          showToast('已移动到所选空间')
        }}
        onClose={() => setMovingBookmark(null)}
      />
      {spaceAction && (
        <BookmarkSpaceDialog
          bookmark={spaceAction.bookmark}
          partitions={state.partitions}
          sourceId={spaceAction.sourceId}
          mode={spaceAction.mode}
          onClose={() => setSpaceAction(null)}
          onConfirm={(ids, allSpaces) => {
            if (spaceAction.mode === 'copy') {
              store.copyBookmarkToPartitions(spaceAction.bookmark, spaceAction.sourceId, ids)
              showToast('已复制到所选空间')
            } else {
              store.deleteBookmarkScoped(spaceAction.bookmark, spaceAction.sourceId, allSpaces)
              showToast(allSpaces ? '已从所有空间删除' : '已从当前空间删除')
            }
            setSpaceAction(null)
          }}
        />
      )}

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

      {/* 拖拽幻影：保留原始抓取位置跟随；松手后飞向目标槽位（落点吸附），到位才提交 */}
      {drag &&
        (() => {
          const src = drag.source
          const settle = drag.settle
          let folderPreview = false
          let visualHeight = iconPx
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
            } else if (it.kind === 'app') {
              folderPreview = true
              const visual = dragVisualOf(it, iconPx)
              visualHeight = visual.h
              const source = it.app.type === 'answers'
                ? Array.from(gridRef.current?.el.querySelectorAll<HTMLElement>('[data-desktop-item-id]') ?? []).find(el => el.dataset.desktopItemId === it.id)?.querySelector<HTMLElement>('.app-widget') ?? null
                : null
              icon = source ? <AnimatedDragPreview source={source} /> : <AppTile app={it.app} width={visual.w} height={visual.h} preview />
            } else {
              name = it.group.name
              folderPreview = true
              visualHeight = dragVisualOf(it, iconPx).h
              icon = <FolderTile group={it.group} editMode={false} iconPx={iconPx} enterDelay={0} preview onOpen={() => {}} onRename={() => {}} onDelete={() => {}} />
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
              data-wallpaper-ghost={src.kind === 'desktop-item' ? src.itemId : undefined}
              style={{
                left: settle ? settle.toX : drag.x + drag.anchor.x,
                top: settle ? settle.toY : drag.y + drag.anchor.y,
                transform: `translate(-50%, -${visualHeight / 2}px) scale(${gScale * (settle ? settle.scale : 1)})`,
                transformOrigin: `50% ${visualHeight / 2}px`,
                opacity: settle?.fade ? 0 : 1,
                transition: settle
                  ? `left ${SETTLE_MS}ms cubic-bezier(.25,.8,.35,1), top ${SETTLE_MS}ms cubic-bezier(.25,.8,.35,1), transform ${SETTLE_MS}ms ease, opacity ${SETTLE_MS}ms ease`
                  : undefined,
              }}
            >
              <div>{icon}</div>
              <span hidden={folderPreview} className="max-w-24 truncate rounded bg-black/35 px-1.5 py-0.5 text-xs text-white backdrop-blur-sm">
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
        <div role="status" aria-live="polite" className="toast-in pointer-events-none fixed top-[calc(env(safe-area-inset-top)+0.75rem)] left-1/2 z-[100] w-max max-w-[calc(100vw-2rem)] rounded-2xl bg-black/70 px-5 py-2 text-center text-sm text-white backdrop-blur-md">
          {toast}
        </div>
      )}
    </div>
  )
}
