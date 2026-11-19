import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Bookmark as BookmarkIcon, Cloud, Folder, Loader2, LogOut, Search, Settings2, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useBookmarkStore } from '@/hooks/useBookmarkStore'
import { useCloudSync } from '@/hooks/useCloudSync'
import { useSyncedLogout } from '@/hooks/useSyncedLogout'
import { useAppFont } from '@/hooks/useAppFont'
import { mobileItems } from '@/lib/mobileLayout'
import { searchBookmarks } from '@/lib/searchBookmarks'
import { FaviconImg } from '@/components/FaviconImg'
import { PwaInstall } from '@/components/PwaInstall'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import './MobileHome.css'

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

function LoadingScreen({ retry, failed, exiting = false }: { retry: () => void; failed: boolean; exiting?: boolean }) {
  return (
    <main className="mobile-home grid min-h-dvh place-items-center px-6 text-center">
      <div className="mobile-loading">
        <span className="mobile-brand-mark mx-auto"><BookmarkIcon size={25} /></span>
        <h1 className="mt-5 text-xl font-semibold">书签桌面</h1>
        <p className="mt-2 text-sm text-slate-500">{exiting ? '正在退出登录…' : failed ? '暂时无法读取书签，请检查网络后重试' : '正在为你准备空间…'}</p>
        {failed ? <button onClick={retry} className="mobile-primary mt-5 px-7">重新加载</button>
          : <Loader2 className="mx-auto mt-5 animate-spin text-[#367467]" size={20} aria-label="正在加载" />}
      </div>
    </main>
  )
}

export default function MobileHome() {
  const { user, isLoading: authLoading, logout } = useAuth({ redirectOnUnauthenticated: true })
  const store = useBookmarkStore()
  const { state } = store
  useAppFont(state.font, state.fontScale)
  const [selectedPartitionId, setSelectedPartitionId] = useState<string | null>(null)
  const activePartition = state.partitions.find((partition) => partition.id === selectedPartitionId) ?? store.activePartition
  const cloud = useCloudSync(state, store.replaceState, user?.id, { readOnly: true })
  const [logoutError, setLogoutError] = useState('')
  const { exiting, exit } = useSyncedLogout(cloud.flushPending, logout, setLogoutError)
  const [query, setQuery] = useState('')
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
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

  if (exiting || authLoading || !user || !cloud.hydrated) {
    return <LoadingScreen retry={cloud.retryLoad} failed={cloud.loadError} exiting={exiting} />
  }

  const switchPartition = (id: string) => {
    if (id === activePartition.id) return
    setOpenGroupId(null)
    setQuery('')
    setSelectedPartitionId(id)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
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
        </nav>
        </div>
        <div className="mobile-search-row">
          <div className="mobile-search">
            <Search size={18} aria-hidden="true" />
            <input ref={searchRef} type="search" aria-label="搜索书签" enterKeyHint="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索当前空间的书签" />
            {query && <button type="button" aria-label="清空搜索" onClick={() => { setQuery(''); searchRef.current?.focus() }}><X size={18} /></button>}
          </div>
          <button type="button" aria-label="账号与应用" onClick={() => setAccountOpen(true)} className="mobile-icon-button"><Settings2 size={19} /></button>
        </div>
      </header>
      <div className="mobile-content">
        {(cloud.error || logoutError) && <div role="alert" className="mobile-error">{logoutError || cloud.error}</div>}

        <section className="mobile-library" aria-label={normalizedQuery ? '搜索结果' : '空间项目'}>
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
              <div className="mobile-grid" key={activePartition.id}>
                {orderedItems.map((item, index) => (
                  <div key={item.id} className="mobile-tile" style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}>
                    {item.kind === 'bookmark' ? (
                      <>
                        <a href={item.bookmark.url} target="_blank" rel="noreferrer" className="mobile-tile-link"><span className="mobile-tile-icon"><FaviconImg url={item.bookmark.url} name={item.bookmark.name} customIcon={item.bookmark.icon} size={46} /></span><span className="mobile-tile-name">{item.bookmark.name}</span></a>
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
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
              {!orderedItems.length && <div className="mobile-empty"><BookmarkIcon size={30} /><h3>这个空间还没有书签</h3><p>可在电脑端添加书签后，在这里查看</p></div>}
            </>
          )}
        </section>
      </div>

      <MobileSheet open={!!openGroup} onOpenChange={(open) => !open && setOpenGroupId(null)} title={openGroup?.name ?? '文件夹'} description={`${openGroup?.bookmarks.length ?? 0} 个书签 · 下滑关闭`}>
        <div className="mobile-folder-list">
          {openGroup?.bookmarks.map((bookmark) => (
            <div key={bookmark.id} className="mobile-folder-row">
              <a href={bookmark.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3">
                <FaviconImg url={bookmark.url} name={bookmark.name} customIcon={bookmark.icon} size={40} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{bookmark.name}</span><span className="mt-1 block truncate text-xs text-[#839088]">{bookmark.url}</span></span>
              </a>
            </div>
          ))}
          {!openGroup?.bookmarks.length && <p className="py-8 text-center text-sm text-[#839088]">这个文件夹还没有书签</p>}
        </div>
      </MobileSheet>

      <MobileSheet open={accountOpen} onOpenChange={setAccountOpen} title="账号与数据" description={user.email ?? user.name ?? '已登录'}>
        <PwaInstall />
        <div className="mobile-account-status"><Cloud size={19} /><div><strong>{cloud.error ? '云端读取需要留意' : '只读浏览'}</strong><p>{cloud.error ? '请检查网络，切回页面后将重试' : '可切换空间、搜索和打开书签；内容请在电脑端管理'}</p></div></div>
        <button onClick={() => { setLogoutError(''); void exit() }} className="mobile-logout"><LogOut size={17} />退出登录</button>
      </MobileSheet>

    </main>
  )
}
