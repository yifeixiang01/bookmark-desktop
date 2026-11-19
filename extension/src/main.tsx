import { useEffect, useRef, useState } from 'react'
import { SITE, isWebUrl } from './shared'
import type { Account, Page, Space } from './shared'
import './style.css'

export default function App() {
  const [page, setPage] = useState<Page>({ url: '', title: '' })
  const [account, setAccount] = useState<Account | null>(null)
  const [spaces, setSpaces] = useState<Space[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [description, setDescription] = useState('')
  const [metaLoading, setMetaLoading] = useState(false)
  const [metaNotice, setMetaNotice] = useState('')
  const titleEdited = useRef(false)
  const descriptionEdited = useRef(false)
  const metadataRequest = useRef(0)
  const [needsLogin, setNeedsLogin] = useState(false)
  const draftKey = useRef('')
  const initialized = useRef(false)
  const latest = useRef({ page, description, selected })
  latest.current = { page, description, selected }
  const captureMode = new URLSearchParams(location.search).has('capture')

  async function api(path: string, init?: RequestInit) {
    const { session } = await chrome.storage.local.get<{ session?: { token: string; expiresAt: string } }>('session')
    if (!session?.token || Date.parse(session.expiresAt) <= Date.now()) {
      setNeedsLogin(true); setAccount(null)
      throw new Error('请登录并授权后保存书签')
    }
    const response = await fetch(`${SITE}/api/extension${path}`, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000) })
    const body = await response.json().catch(() => ({ error: '服务返回异常，请稍后重试' }))
    if (response.status === 401) { setNeedsLogin(true); setAccount(null); await chrome.storage.local.remove('session') }
    if (!response.ok) throw new Error(body.error || '请求失败，请重试')
    return body
  }
  async function refresh(current: Page, retainSelection = false) {
    setLoading(true); setError('')
    try {
      const data: { user: Account; spaces: Space[] } = await api(`/spaces?url=${encodeURIComponent(current.url)}`)
      setAccount(data.user); setNeedsLogin(false); setSpaces(data.spaces)
      const key = `selected:${data.user.id}`
      const stored = await chrome.storage.local.get<Record<string, string[]>>(key)
      const prior = retainSelection ? latest.current.selected : stored[key] || []
      const valid = prior.filter((id: string) => data.spaces.some(s => s.id === id))
      setSelected(valid.length ? valid : data.spaces[0] ? [data.spaces[0].id] : [])
      if (!retainSelection) void loadMeta(current)
    } catch (e) { setError(e instanceof Error ? e.message : '连接失败，请重试') }
    finally { setLoading(false) }
  }
  async function loadMeta(current: Page) {
    if (!isWebUrl(current.url)) return
    const request = ++metadataRequest.current
    setMetaLoading(true); setMetaNotice('')
    try {
      const meta: { ok: boolean; title?: string; description?: string; icon?: string } = await api(`/meta?url=${encodeURIComponent(current.url)}`)
      if (request !== metadataRequest.current) return
      if (!meta.ok) { setMetaNotice('未能获取网站信息，可手动填写'); return }
      setPage(previous => previous.url === current.url ? { ...previous, title: !titleEdited.current && meta.title ? meta.title : previous.title, icon: isWebUrl(meta.icon) ? meta.icon : previous.icon } : previous)
      if (!descriptionEdited.current && meta.description) setDescription(meta.description)
      if (!meta.description) setMetaNotice('该网页未提供简介，可手动填写')
    } catch {
      if (request === metadataRequest.current) setMetaNotice('未能获取网站信息，可手动填写')
    } finally { if (request === metadataRequest.current) setMetaLoading(false) }
  }
  async function refreshAccount() {
    setLoading(true); setError('')
    try {
      const data: { user: Account; spaces: Space[] } = await api('/spaces')
      setAccount(data.user); setSpaces(data.spaces); setNeedsLogin(false)
    } catch (e) { setError(e instanceof Error ? e.message : '连接失败，请重试') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    let disposed = false
    async function start() {
      try {
        const capture = new URLSearchParams(location.search).get('capture')
        if (!capture) {
          await refreshAccount()
          return
        }
        let current: Page
        if (capture) {
          const key = `page:${capture}`
          current = (await chrome.storage.session.get<Record<string, Page>>(key))[key] || { url: '', title: '' }
          draftKey.current = `draft:${capture}`
        } else {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
          current = { url: tab?.url || '', title: tab?.title || '', icon: isWebUrl(tab?.favIconUrl) ? tab.favIconUrl : undefined }
          draftKey.current = `draft:${tab?.id}:${current.url}`
        }
        const draft = (await chrome.storage.session.get<Record<string, { page: Page; description?: string }>>(draftKey.current))[draftKey.current]
        if (draft?.page?.url === current.url) { current = draft.page; setDescription(draft.description || ''); titleEdited.current = true; descriptionEdited.current = !!draft.description }
        if (disposed) return
        setPage(current); initialized.current = true
        await refresh(current)
      } catch { if (!disposed) { setError('无法获取网页，请在普通网页中重试'); setLoading(false) } }
    }
    void start()
    const changed = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !changes.session) return
      if (!changes.session.newValue) {
        setAccount(null); setSpaces([]); setSelected([]); setNeedsLogin(true); setLoading(false)
      } else if (captureMode) void refresh(latest.current.page)
      else void refreshAccount()
    }
    chrome.storage.onChanged.addListener(changed)
    return () => { disposed = true; chrome.storage.onChanged.removeListener(changed) }
    // Initialization and the storage listener read live values through latest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (initialized.current && draftKey.current) void chrome.storage.session.set({ [draftKey.current]: { page, description } })
  }, [page, description])

  async function login() {
    setBusy(true); setError(''); setSuccess('')
    try {
      const result = await chrome.runtime.sendMessage({ type: 'login' })
      if (result.error) throw new Error(result.error)
      if (captureMode) await refresh(page)
      else await refreshAccount()
    } catch (e) { setError(e instanceof Error ? e.message : '授权未完成，请重新登录') }
    finally { setBusy(false) }
  }
  async function logout() {
    setBusy(true); setError('')
    try { await api('/logout', { method: 'POST' }) }
    catch { setError('无法确认云端退出，已清除本机登录；原授权将在到期后失效。') }
    finally { await chrome.storage.local.remove('session'); setAccount(null); setSpaces([]); setSelected([]); setNeedsLogin(true); setSuccess(''); setBusy(false) }
  }
  async function save() {
    setBusy(true); setError(''); setSuccess('')
    try {
      const result: { added: string[]; skipped: string[] } = await api('/bookmarks', { method: 'POST', body: JSON.stringify({ title: page.title.trim(), url: page.url, icon: isWebUrl(page.icon) ? page.icon : undefined, description: description.trim() || undefined, spaceIds: selected }) })
      await chrome.storage.local.set({ [`selected:${account!.id}`]: selected })
      const saved = [...result.added, ...result.skipped]
      setSpaces(old => old.map(s => saved.includes(s.id) ? { ...s, saved: true } : s))
      setSuccess(result.added.length ? `已保存到 ${result.added.length} 个空间${result.skipped.length ? `，${result.skipped.length} 个空间已收藏` : ''}` : '所选空间均已收藏，无需重复保存')
      await chrome.storage.session.remove(draftKey.current)
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败，信息已保留，请重试') }
    finally { setBusy(false) }
  }
  const supported = isWebUrl(page.url)
  if (!captureMode) return <main className="account-panel">
    <header><h1>Stashy</h1><a href={SITE} target="_blank" rel="noreferrer">打开书签桌面 ↗</a></header>
    {loading ? <div className="empty">正在加载账号信息…</div> : needsLogin ? <section className="login"><p>登录 Stashy 后，收藏会同步到你的账号。</p><button className="primary" disabled={busy} onClick={login}>{busy ? '请在打开的网站完成授权…' : '登录并授权'}</button><a href={`${SITE}/login`} target="_blank" rel="noreferrer">没有账号？前往官网注册 ↗</a></section> : account ? <section className="account-card">
      <div className="avatar">{(account.name || account.email || 'D').slice(0, 1).toUpperCase()}</div>
      <strong>{account.name || 'Stashy 用户'}</strong><span>{account.email || '已登录账号'}</span>
      <div className="account-stats"><div><b>{spaces.length}</b><small>个空间</small></div><div><b>已授权</b><small>账号状态</small></div></div>
      <button className="secondary" disabled={busy} onClick={logout}>退出登录</button>
    </section> : <button className="secondary" onClick={refreshAccount}>重新连接</button>}
    {error && <p className="error" role="alert">{error}</p>}
  </main>
  return <main>
    <header><h1>保存书签</h1><a href={SITE} target="_blank" rel="noreferrer" title="打开书签桌面">Stashy ↗</a></header>
    {loading ? <div className="empty" aria-live="polite">正在加载空间…</div> : needsLogin ? <section className="login"><p>在网站使用邮箱登录，并确认授权 Stashy，即可开始收藏。</p><button className="primary" disabled={busy} onClick={login}>{busy ? '请在打开的网站完成授权…' : '登录并授权'}</button><a href={`${SITE}/login`} target="_blank" rel="noreferrer">没有账号？前往官网注册 ↗</a></section> : account ? <>
    <section className="preview"><div className="page-icon">{isWebUrl(page.icon) ? <img src={page.icon} alt="" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none' }} /> : '↗'}</div><div><strong>{page.title || '未命名网页'}</strong><p title={page.url}>{page.url || '无法读取网址'}</p></div></section>
    {!supported && <p className="warning">此页面暂不支持收藏，请在 HTTP / HTTPS 网页使用 Stashy。</p>}
    <label className="field">书签名称<input maxLength={300} value={page.title} disabled={busy} onChange={e => { titleEdited.current = true; setPage({ ...page, title: e.target.value }); setSuccess('') }} placeholder="给书签取个名字" /></label>
    <label className="field description-field">网站描述<textarea aria-label="网站描述" maxLength={2000} value={description} disabled={busy} onChange={e => { descriptionEdited.current = true; setDescription(e.target.value); setSuccess('') }} placeholder={metaLoading ? '正在获取网站描述…' : '该网页暂无描述，可手动填写'} rows={3} /></label>
    {(metaLoading || metaNotice) && <p className="meta-notice" role="status">{metaLoading ? '正在获取网页图标、名称和描述…' : metaNotice}</p>}
    <div className="space-heading"><h2>保存到空间 <small>可多选</small></h2><button className="text-button" disabled={busy} onClick={() => refresh(page, true)}>刷新</button></div>
    <div className="spaces">{spaces.map(space => <label className={`space ${selected.includes(space.id) ? 'chosen' : ''}`} key={space.id}><input type="checkbox" checked={selected.includes(space.id)} disabled={busy} onChange={e => { setSelected(e.target.checked ? [...selected, space.id] : selected.filter(id => id !== space.id)); setSuccess('') }} /><span>{space.name}</span>{space.saved && <small>已收藏</small>}</label>)}{!spaces.length && <p>暂无空间，请前往网页端创建后刷新。</p>}</div>
    <button className="primary" disabled={busy || metaLoading || !supported || !selected.length || !page.title.trim()} onClick={save}>{busy ? '正在处理…' : metaLoading ? '正在获取网站信息…' : `保存书签${selected.length ? ` · ${selected.length} 个空间` : ''}`}</button>
    </> : <button className="primary" onClick={() => refresh(page)}>重新连接</button>}
    {error && <p className="error" role="alert">{error}</p>}{success && <p className="success" role="status">✓ {success}</p>}
  </main>
}
