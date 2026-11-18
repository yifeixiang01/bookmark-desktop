import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, Bookmark as BookmarkIcon,
  ChevronRight, Cloud, Folder, FolderPlus, Layers3, Loader2,
  LogOut, Pencil, Plus, Search, Settings2, Trash2, X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useBookmarkStore } from '@/hooks/useBookmarkStore'
import { useCloudSync } from '@/hooks/useCloudSync'
import { mobileItems } from '@/lib/mobileLayout'
import { searchBookmarks } from '@/lib/searchBookmarks'
import { exportJSON } from '@/lib/store'
import type { Bookmark } from '@/types/bookmark'
import { FaviconImg } from '@/components/FaviconImg'
import { BookmarkFormDialog } from '@/components/BookmarkFormDialog'
import { NamePromptDialog } from '@/components/NamePromptDialog'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import './MobileHome.css'

type BookmarkEditor = {
  open: boolean
  defaultGroupId?: string | null
  editing?: { groupId: string | null; bookmark: Bookmark } | null
}
type NamePrompt = { title: string; value?: string; save: (name: string) => void }
type DeletePrompt = { name: string; description: string; action: () => void }

function MobileSheet({ open, onOpenChange, title, description, children }: {
  open: boolean; onOpenChange: (open: boolean) => void
  title: string; description: string; children: ReactNode
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mobile-sheet">
        <DrawerHeader className="mobile-sheet-header">
          <DrawerTitle className="pr-12 text-left text-xl text-[#193f39]">{title}</DrawerTitle>
          <DrawerDescription className="mt-1 text-left">{description}</DrawerDescription>
          <DrawerClose className="mobile-icon-button absolute right-5 top-7" aria-label="关闭面板"><X size={20} /></DrawerClose>
        </DrawerHeader>
        <div className="mobile-sheet-body">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}

function LoadingScreen({ retry, failed }: { retry: () => void; failed: boolean }) {
  return (
    <main className="mobile-home grid min-h-dvh place-items-center px-6 text-center">
      <div className="mobile-loading">
        <span className="mobile-brand-mark mx-auto"><BookmarkIcon size={25} /></span>
        <h1 className="mt-5 text-xl font-semibold">书签桌面</h1>
        <p className="mt-2 text-sm text-slate-500">{failed ? '暂时无法读取书签，请检查网络后重试' : '正在为你准备空间…'}</p>
        {failed ? <button onClick={retry} className="mobile-primary mt-5 px-7">重新加载</button>
          : <Loader2 className="mx-auto mt-5 animate-spin text-[#367467]" size={20} aria-label="正在加载" />}
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
  const [addOpen, setAddOpen] = useState(false)
  const [namePrompt, setNamePrompt] = useState<NamePrompt | null>(null)
  const [deletePrompt, setDeletePrompt] = useState<DeletePrompt | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const groups = useMemo(
    () => activePartition.items.flatMap((item) => item.kind === 'group' ? [item.group] : []),
    [activePartition.items],
  )
  const orderedItems = useMemo(() => mobileItems(activePartition), [activePartition])
  const openGroup = groups.find((group) => group.id === openGroupId) ?? null
  const normalizedQuery = query.trim()
  const searchResults = useMemo(
    () => searchBookmarks([activePartition], query),
    [activePartition, query],
  )

  if (authLoading || !user || !cloud.hydrated) {
    return <LoadingScreen retry={cloud.retryLoad} failed={cloud.loadError} />
  }

  const editBookmark = (bookmark: Bookmark, groupId: string | null) => {
    setOpenGroupId(null)
    setEditor({ open: true, editing: { bookmark, groupId } })
  }
  const deleteBookmark = (bookmark: Bookmark) => {
    setOpenGroupId(null)
    setDeletePrompt({ name: bookmark.name, description: '此书签将从当前空间移除。', action: () => store.deleteBookmark(bookmark.id) })
  }
  const saveBookmark = (groupId: string | null, bookmark: Bookmark, newGroupName?: string) => {
    if (newGroupName) store.saveBookmarkToNewGroup(newGroupName, bookmark)
    else store.saveBookmark(groupId, bookmark)
  }
  const switchPartition = (id: string) => {
    if (id === activePartition.id) return
    setOpenGroupId(null)
    setEditMode(false)
    setQuery('')
    store.setActivePartition(id)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const reorderButtons = (id: string, index: number, edit?: () => void) => (
    <div className="mobile-reorder">
      <button aria-label="向前移动" disabled={index === 0} onClick={() => store.reorderMobileItem(id, -1)}><ArrowLeft size={16} /></button>
      {edit && <button aria-label="编辑书签" onClick={edit}><Pencil size={15} /></button>}
      <button aria-label="向后移动" disabled={index === orderedItems.length - 1} onClick={() => store.reorderMobileItem(id, 1)}><ArrowRight size={16} /></button>
    </div>
  )

  return (
    <main className="mobile-home">
      <header className="mobile-header">
        <div className="mobile-header-inner">
        <nav className="mobile-spaces no-scrollbar" aria-label="书签空间">
          {state.partitions.map((partition) => (
            <button key={partition.id} type="button" aria-current={partition.id === activePartition.id ? 'page' : undefined} onClick={(event) => { switchPartition(partition.id); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) }}>
              {partition.name}
            </button>
          ))}
          <button type="button" aria-label="新建空间" className="mobile-space-add" onClick={() => setNamePrompt({ title: '新建空间', save: store.addPartition })}><Plus size={18} /></button>
        </nav>
        </div>
        <div className="mobile-search-row">
          <div className="mobile-search">
            <Search size={18} aria-hidden="true" />
            <input ref={searchRef} type="search" aria-label="搜索书签" enterKeyHint="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索当前空间的书签" />
            {query && <button type="button" aria-label="清空搜索" onClick={() => { setQuery(''); searchRef.current?.focus() }}><X size={18} /></button>}
          </div>
          <button type="button" aria-label="空间管理与账号" onClick={() => setAccountOpen(true)} className="mobile-icon-button"><Settings2 size={19} /></button>
        </div>
      </header>
      <div className="mobile-content">
        {cloud.error && <div role="alert" className="mobile-error">{cloud.error}<button onClick={() => exportJSON(state)}>导出本地备份<ArrowDownToLine size={14} /></button></div>}

        <section className="mobile-library" aria-label={normalizedQuery ? '搜索结果' : '空间项目'}>
          {editMode && <div className="mobile-edit-bar"><span>整理书签</span><button onClick={() => setEditMode(false)}>完成</button></div>}
          {normalizedQuery ? (
            <div className="mobile-grid" key={`search-${activePartition.id}`}>
              {searchResults.map(({ bookmark, spaceId }) => (
                <a key={`${spaceId}-${bookmark.id}`} href={bookmark.url} target="_blank" rel="noreferrer" className="mobile-tile mobile-tile-link">
                  <span className="mobile-tile-icon"><FaviconImg url={bookmark.url} name={bookmark.name} customIcon={bookmark.icon} size={46} /></span>
                  <span className="mobile-tile-name">{bookmark.name}</span>
                </a>
              ))}
              {!searchResults.length && <div className="mobile-empty col-span-full"><Search size={28} /><h3>没有找到相关书签</h3><p>试试其他名称、网址或描述关键词</p><button onClick={() => { setQuery(''); searchRef.current?.focus() }}>清空搜索</button></div>}
            </div>
          ) : (
            <>
              {editMode && <p role="status" className="mobile-edit-hint">点击箭头调整顺序，点击铅笔编辑内容</p>}
              <div className={`mobile-grid ${editMode ? 'is-editing' : ''}`} key={activePartition.id}>
                {orderedItems.map((item, index) => (
                  <div key={item.id} className="mobile-tile" style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}>
                    {item.kind === 'bookmark' ? (
                      <>
                        {editMode ? (
                          <button type="button" aria-label={`编辑${item.bookmark.name}`} onClick={() => editBookmark(item.bookmark, null)} className="mobile-tile-link"><span className="mobile-tile-icon"><FaviconImg url={item.bookmark.url} name={item.bookmark.name} customIcon={item.bookmark.icon} size={46} /></span><span className="mobile-tile-name">{item.bookmark.name}</span></button>
                        ) : (
                          <a href={item.bookmark.url} target="_blank" rel="noreferrer" className="mobile-tile-link"><span className="mobile-tile-icon"><FaviconImg url={item.bookmark.url} name={item.bookmark.name} customIcon={item.bookmark.icon} size={46} /></span><span className="mobile-tile-name">{item.bookmark.name}</span></a>
                        )}
                        {editMode && <><button aria-label={`删除${item.bookmark.name}`} onClick={() => deleteBookmark(item.bookmark)} className="mobile-delete"><X size={13} /></button>{reorderButtons(item.id, index)}</>}
                      </>
                    ) : item.kind === 'group' ? (
                      <>
                        <button type="button" onClick={() => setOpenGroupId(item.group.id)} className="mobile-tile-link" aria-label={`打开文件夹${item.group.name}，${item.group.bookmarks.length}个书签`}>
                          <span className="mobile-folder-icon">
                            {item.group.bookmarks.length ? item.group.bookmarks.slice(0, 4).map((bookmark) => <FaviconImg key={bookmark.id} url={bookmark.url} name={bookmark.name} customIcon={bookmark.icon} size={21} className="!rounded-md" />) : <Folder size={27} className="col-span-2 row-span-2 text-[#719185]" />}
                            <span className="mobile-folder-count">{item.group.bookmarks.length}</span>
                          </span>
                          <span className="mobile-tile-name">{item.group.name}</span>
                        </button>
                        {editMode && reorderButtons(item.id, index)}
                      </>
                    ) : null}
                  </div>
                ))}
                {!!orderedItems.length && !editMode && <button type="button" className="mobile-tile mobile-tile-link mobile-add-tile" onClick={() => setAddOpen(true)}><span className="mobile-tile-icon"><Plus size={24} strokeWidth={1.5} /></span><span className="mobile-tile-name">添加收藏</span></button>}
              </div>
              {!orderedItems.length && <div className="mobile-empty"><BookmarkIcon size={30} /><h3>留一点空间，给新的灵感</h3><p>把喜欢的网站收进来，随时随地打开</p><button onClick={() => setEditor({ open: true, defaultGroupId: null })}><Plus size={16} />添加第一个书签</button></div>}
            </>
          )}
        </section>
      </div>

      <MobileSheet open={!!openGroup} onOpenChange={(open) => !open && setOpenGroupId(null)} title={openGroup?.name ?? '文件夹'} description={`${openGroup?.bookmarks.length ?? 0} 个书签 · 下滑关闭`}>
        <div className="mobile-folder-actions">
          <button onClick={() => { if (!openGroup) return; const group = openGroup; setOpenGroupId(null); setNamePrompt({ title: '重命名文件夹', value: group.name, save: (name) => store.renameGroup(group.id, name) }) }}><Pencil size={15} />重命名</button>
          <button className="text-red-500" onClick={() => { if (!openGroup) return; const group = openGroup; setOpenGroupId(null); setDeletePrompt({ name: group.name, description: `文件夹及其中的 ${group.bookmarks.length} 个书签将从当前空间移除。`, action: () => store.deleteGroup(group.id) }) }}><Trash2 size={15} />删除文件夹</button>
        </div>
        <div className="mobile-folder-list">
          {openGroup?.bookmarks.map((bookmark) => (
            <div key={bookmark.id} className="mobile-folder-row">
              <a href={bookmark.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3">
                <FaviconImg url={bookmark.url} name={bookmark.name} customIcon={bookmark.icon} size={40} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{bookmark.name}</span><span className="mt-1 block truncate text-xs text-[#839088]">{bookmark.url}</span></span>
              </a>
              <button aria-label={`编辑${bookmark.name}`} onClick={() => editBookmark(bookmark, openGroup.id)} className="mobile-icon-button"><Pencil size={16} /></button>
              <button aria-label={`删除${bookmark.name}`} onClick={() => deleteBookmark(bookmark)} className="mobile-icon-button text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
          {!openGroup?.bookmarks.length && <p className="py-8 text-center text-sm text-[#839088]">文件夹还是空的，添加一个喜欢的网站吧</p>}
        </div>
        <button onClick={() => { setEditor({ open: true, defaultGroupId: openGroup?.id }); setOpenGroupId(null) }} className="mobile-primary mt-4 w-full"><Plus size={18} />添加到文件夹</button>
      </MobileSheet>

      <MobileSheet open={addOpen} onOpenChange={setAddOpen} title="收藏新的灵感" description={`添加到「${activePartition.name}」`}>
        <button className="mobile-action-row" onClick={() => { setAddOpen(false); setEditor({ open: true, defaultGroupId: null }) }}><span className="mobile-action-icon"><BookmarkIcon size={21} /></span><span><strong>添加书签</strong><small>保存网址，自动获取网站信息</small></span><ChevronRight size={18} /></button>
        <button className="mobile-action-row" onClick={() => { setAddOpen(false); setNamePrompt({ title: '新建文件夹', save: store.addGroup }) }}><span className="mobile-action-icon"><FolderPlus size={21} /></span><span><strong>新建文件夹</strong><small>把相似的收藏放在一起</small></span><ChevronRight size={18} /></button>
        <button className="mobile-action-row" onClick={() => { setAddOpen(false); setNamePrompt({ title: '新建空间', save: store.addPartition }) }}><span className="mobile-action-icon"><Layers3 size={21} /></span><span><strong>新建空间</strong><small>为工作、生活划分独立空间</small></span><ChevronRight size={18} /></button>
      </MobileSheet>

      <MobileSheet open={accountOpen} onOpenChange={setAccountOpen} title="账号与数据" description={user.email ?? user.name ?? '已登录'}>
        <button className="mobile-action-row" onClick={() => { setAccountOpen(false); setAddOpen(true) }}><span className="mobile-action-icon"><Plus size={20} /></span><span><strong>添加收藏</strong><small>添加书签、文件夹或空间</small></span><ChevronRight size={18} /></button>
        <button className="mobile-action-row" onClick={() => { setAccountOpen(false); setQuery(''); setEditMode((value) => !value) }}><span className="mobile-action-icon"><Settings2 size={20} /></span><span><strong>{editMode ? '完成整理' : '整理书签'}</strong><small>调整图标顺序、编辑或删除书签</small></span><ChevronRight size={18} /></button>
        <div className="mobile-account-status"><Cloud size={19} /><div><strong>{cloud.error ? '云端同步需要留意' : cloud.syncing ? '正在保存修改' : '收藏随行，多端共享'}</strong><p>{cloud.error ? '本地修改已保留，请先导出备份' : '手机与电脑使用同一份书签数据'}</p></div></div>
        <button className="mobile-action-row" onClick={() => exportJSON(state)}><span className="mobile-action-icon"><ArrowDownToLine size={20} /></span><span><strong>导出书签备份</strong><small>下载完整的 JSON 数据文件</small></span><ChevronRight size={18} /></button>
        <button className="mobile-action-row" onClick={() => { setAccountOpen(false); setNamePrompt({ title: '重命名空间', value: activePartition.name, save: (name) => store.renamePartition(activePartition.id, name) }) }}><span className="mobile-action-icon"><Pencil size={20} /></span><span><strong>重命名当前空间</strong><small className="max-w-48 truncate">{activePartition.name}</small></span><ChevronRight size={18} /></button>
        <button onClick={logout} className="mobile-logout"><LogOut size={17} />退出登录</button>
      </MobileSheet>

      <AlertDialog open={!!deletePrompt} onOpenChange={(open) => !open && setDeletePrompt(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2.5rem)] rounded-3xl p-6 sm:max-w-sm">
          <AlertDialogHeader><span className="mb-2 grid h-12 w-12 place-items-center self-center rounded-2xl bg-red-50 text-red-500"><Trash2 size={23} /></span><AlertDialogTitle className="break-all text-center">删除「{deletePrompt?.name}」？</AlertDialogTitle><AlertDialogDescription className="text-center">{deletePrompt?.description}此操作无法撤销。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-2 grid grid-cols-2"><AlertDialogCancel className="m-0 h-11 rounded-xl">取消</AlertDialogCancel><AlertDialogAction className="h-11 rounded-xl bg-red-500 hover:bg-red-600" onClick={() => { deletePrompt?.action(); setDeletePrompt(null) }}>确认删除</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <NamePromptDialog mobile open={!!namePrompt} title={namePrompt?.title ?? ''} defaultValue={namePrompt?.value} placeholder="输入一个名字" onClose={() => setNamePrompt(null)} onConfirm={(name) => namePrompt?.save(name)} />
      <BookmarkFormDialog mobile open={editor.open} groups={groups} editing={editor.editing} defaultGroupId={editor.defaultGroupId} onClose={() => setEditor({ open: false })} onSave={saveBookmark} />
    </main>
  )
}
