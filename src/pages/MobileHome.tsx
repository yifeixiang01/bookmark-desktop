import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Folder,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useBookmarkStore } from '@/hooks/useBookmarkStore'
import { useCloudSync } from '@/hooks/useCloudSync'
import { mobileItems } from '@/lib/mobileLayout'
import { allBookmarks, exportJSON } from '@/lib/store'
import type { Bookmark } from '@/types/bookmark'
import { FaviconImg } from '@/components/FaviconImg'
import { BookmarkFormDialog } from '@/components/BookmarkFormDialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type BookmarkEditor = {
  open: boolean
  defaultGroupId?: string | null
  editing?: { groupId: string | null; bookmark: Bookmark } | null
}

function LoadingScreen({ retry, failed }: { retry: () => void; failed: boolean }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-100 px-6 text-center">
      <div>
        {failed ? (
          <>
            <p className="text-sm text-slate-600">数据加载失败，请检查本地服务或网络。</p>
            <button onClick={retry} className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm text-white">重试</button>
          </>
        ) : (
          <>
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
            <p className="mt-3 text-sm text-slate-500">正在读取书签...</p>
          </>
        )}
      </div>
    </main>
  )
}

export default function MobileHome() {
  const { user, isLoading: authLoading, logout } = useAuth({ redirectOnUnauthenticated: true })
  const store = useBookmarkStore()
  const { state, activePartition } = store
  const cloud = useCloudSync(state, store.replaceState, user?.id)
  const [query, setQuery] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)
  const [editor, setEditor] = useState<BookmarkEditor>({ open: false })
  const [accountOpen, setAccountOpen] = useState(false)

  const groups = useMemo(
    () => activePartition.items.flatMap((item) => item.kind === 'group' ? [item.group] : []),
    [activePartition.items],
  )
  const orderedItems = useMemo(() => mobileItems(activePartition), [activePartition])
  const openGroup = useMemo(
    () => groups.find((group) => group.id === openGroupId) ?? null,
    [groups, openGroupId],
  )
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return []
    return allBookmarks(activePartition).filter((bookmark) =>
      `${bookmark.name} ${bookmark.url} ${bookmark.description ?? ''}`.toLocaleLowerCase().includes(normalizedQuery)
    )
  }, [activePartition, normalizedQuery])

  if (authLoading || !user || !cloud.hydrated) {
    return <LoadingScreen retry={cloud.retryLoad} failed={cloud.loadError} />
  }

  const editBookmark = (bookmark: Bookmark, groupId: string | null) => {
    setEditor({ open: true, editing: { bookmark, groupId } })
  }

  const saveBookmark = (groupId: string | null, bookmark: Bookmark, newGroupName?: string) => {
    if (newGroupName) store.saveBookmarkToNewGroup(newGroupName, bookmark)
    else store.saveBookmark(groupId, bookmark)
  }

  return (
    <main className="min-h-dvh bg-[#f5f6f8] pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="flex h-10 items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase text-slate-400">书签桌面</p>
            <h1 className="truncate text-lg font-semibold">{activePartition.name}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={editMode ? '完成排序' : '整理书签'}
              onClick={() => setEditMode((value) => !value)}
              className="grid h-10 w-10 place-items-center rounded-md text-slate-600 active:bg-slate-100"
            >
              {editMode ? <Check size={20} /> : <Pencil size={19} />}
            </button>
            <button
              type="button"
              aria-label="账号菜单"
              onClick={() => setAccountOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-md text-slate-600 active:bg-slate-100"
            >
              <Menu size={21} />
            </button>
          </div>
        </div>

        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {state.partitions.map((partition) => (
            <button
              key={partition.id}
              type="button"
              onClick={() => store.setActivePartition(partition.id)}
              className={`shrink-0 rounded-md px-3 py-2 text-sm ${
                partition.id === activePartition.id
                  ? 'bg-slate-900 font-medium text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {partition.name}
            </button>
          ))}
        </div>

        <label className="mt-3 flex h-11 items-center gap-2 rounded-md bg-slate-100 px-3 text-slate-400 focus-within:ring-2 focus-within:ring-slate-300">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索当前空间"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
          {query && <button type="button" aria-label="清空搜索" onClick={() => setQuery('')}><X size={17} /></button>}
        </label>
      </header>

      {cloud.error && (
        <div role="alert" className="mx-4 mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {cloud.error}
        </div>
      )}

      <section className="px-4 py-5">
        {normalizedQuery ? (
          <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
            {searchResults.map((bookmark) => (
              <a key={bookmark.id} href={bookmark.url} target="_blank" rel="noreferrer" className="flex min-h-16 items-center gap-3 px-2 py-3 active:bg-slate-50">
                <FaviconImg url={bookmark.url} name={bookmark.name} customIcon={bookmark.icon} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{bookmark.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-400">{bookmark.url}</span>
                </span>
              </a>
            ))}
            {!searchResults.length && <p className="py-12 text-center text-sm text-slate-400">没有匹配的书签</p>}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-sm font-semibold">全部项目</h2>
                <p className="mt-0.5 text-xs text-slate-400">{allBookmarks(activePartition).length} 个书签</p>
              </div>
              {editMode && <p className="text-xs text-slate-500">用箭头调整手机端顺序</p>}
            </div>

            <div className="grid grid-cols-4 gap-x-3 gap-y-6">
              {orderedItems.map((item, index) => (
                <div key={item.id} className="relative min-w-0 text-center">
                  {item.kind === 'bookmark' ? (
                    <>
                      <a href={item.bookmark.url} target="_blank" rel="noreferrer" className="mx-auto grid h-14 w-14 place-items-center active:scale-95">
                        <FaviconImg url={item.bookmark.url} name={item.bookmark.name} customIcon={item.bookmark.icon} size={48} />
                      </a>
                      <p className="mt-2 truncate text-xs text-slate-700">{item.bookmark.name}</p>
                      {editMode && (
                        <>
                        <button aria-label="删除书签" onClick={() => { if (window.confirm(`删除「${item.bookmark.name}」？`)) store.deleteBookmark(item.bookmark.id) }} className="absolute right-0 top-0 grid h-7 w-7 place-items-center rounded-full bg-white text-red-500 shadow"><Trash2 size={13} /></button>
                        <div className="mt-1 flex justify-center gap-1">
                          <button aria-label="向前移动" disabled={index === 0} onClick={() => store.reorderMobileItem(item.id, -1)} className="grid h-7 w-7 place-items-center rounded bg-white text-slate-500 shadow-sm disabled:opacity-25"><ArrowLeft size={14} /></button>
                          <button aria-label="编辑书签" onClick={() => editBookmark(item.bookmark, null)} className="grid h-7 w-7 place-items-center rounded bg-white text-slate-500 shadow-sm"><Pencil size={13} /></button>
                          <button aria-label="向后移动" disabled={index === orderedItems.length - 1} onClick={() => store.reorderMobileItem(item.id, 1)} className="grid h-7 w-7 place-items-center rounded bg-white text-slate-500 shadow-sm disabled:opacity-25"><ArrowRight size={14} /></button>
                        </div>
                        </>
                      )}
                    </>
                  ) : item.kind === 'group' ? (
                    <>
                      <button type="button" onClick={() => setOpenGroupId(item.group.id)} className="mx-auto grid h-14 w-14 place-items-center rounded-md bg-slate-200 text-slate-600 active:scale-95">
                        <Folder size={27} fill="currentColor" className="opacity-80" />
                        <span className="absolute mt-8 rounded bg-white px-1 text-[10px] text-slate-500 shadow-sm">{item.group.bookmarks.length}</span>
                      </button>
                      <p className="mt-2 truncate text-xs text-slate-700">{item.group.name}</p>
                      {editMode && (
                        <div className="mt-1 flex justify-center gap-1">
                          <button aria-label="向前移动" disabled={index === 0} onClick={() => store.reorderMobileItem(item.id, -1)} className="grid h-7 w-7 place-items-center rounded bg-white text-slate-500 shadow-sm disabled:opacity-25"><ArrowLeft size={14} /></button>
                          <button aria-label="向后移动" disabled={index === orderedItems.length - 1} onClick={() => store.reorderMobileItem(item.id, 1)} className="grid h-7 w-7 place-items-center rounded bg-white text-slate-500 shadow-sm disabled:opacity-25"><ArrowRight size={14} /></button>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              ))}
            </div>
            {!orderedItems.length && <p className="py-16 text-center text-sm text-slate-400">这个空间还没有书签</p>}
          </>
        )}
      </section>

      <button
        type="button"
        onClick={() => setEditor({ open: true, defaultGroupId: null })}
        aria-label="添加书签"
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-20 grid h-14 w-14 place-items-center rounded-full bg-slate-900 text-white shadow-lg active:scale-95"
      >
        <Plus size={24} />
      </button>

      <Dialog open={!!openGroup} onOpenChange={(open) => !open && setOpenGroupId(null)}>
        <DialogContent className="max-h-[82dvh] max-w-[calc(100%-1.5rem)] overflow-y-auto rounded-md p-0">
          <DialogHeader className="border-b px-5 py-4 text-left">
            <DialogTitle>{openGroup?.name}</DialogTitle>
            <DialogDescription>{openGroup?.bookmarks.length ?? 0} 个书签</DialogDescription>
          </DialogHeader>
          <div className="divide-y px-3 pb-3">
            {openGroup?.bookmarks.map((bookmark) => (
              <div key={bookmark.id} className="flex min-h-16 items-center gap-3 py-2">
                <a href={bookmark.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3">
                  <FaviconImg url={bookmark.url} name={bookmark.name} customIcon={bookmark.icon} size={40} />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-medium">{bookmark.name}</span>
                    <span className="block truncate text-xs text-slate-400">{bookmark.url}</span>
                  </span>
                </a>
                <button aria-label="编辑书签" onClick={() => editBookmark(bookmark, openGroup.id)} className="grid h-10 w-10 place-items-center text-slate-400"><Pencil size={17} /></button>
                <button aria-label="删除书签" onClick={() => { if (window.confirm(`删除「${bookmark.name}」？`)) store.deleteBookmark(bookmark.id) }} className="grid h-10 w-10 place-items-center text-red-500"><Trash2 size={17} /></button>
              </div>
            ))}
            <button onClick={() => { setEditor({ open: true, defaultGroupId: openGroup?.id }); setOpenGroupId(null) }} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-md border border-dashed text-sm text-slate-500"><Plus size={17} />添加到文件夹</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-md p-0">
          <DialogHeader className="border-b px-5 py-4 text-left">
            <DialogTitle>账号与数据</DialogTitle>
            <DialogDescription>{user.email ?? user.name ?? '已登录'}</DialogDescription>
          </DialogHeader>
          <div className="p-3">
            <button onClick={() => exportJSON(state)} className="flex h-12 w-full items-center px-3 text-left text-sm text-slate-700 active:bg-slate-50">导出书签备份</button>
            <button onClick={logout} className="flex h-12 w-full items-center gap-2 px-3 text-left text-sm text-red-600 active:bg-red-50"><LogOut size={17} />退出登录</button>
          </div>
        </DialogContent>
      </Dialog>

      <BookmarkFormDialog
        open={editor.open}
        groups={groups}
        editing={editor.editing}
        defaultGroupId={editor.defaultGroupId}
        onClose={() => setEditor({ open: false })}
        onSave={saveBookmark}
      />
    </main>
  )
}
