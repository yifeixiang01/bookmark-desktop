import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Check, ChevronDown, ExternalLink, FileText, Inbox, Loader2, MoreHorizontal, Plus, Search, Star, Tag, Trash2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { FaviconImg } from '@/components/FaviconImg'
import { trpc } from '@/providers/trpc'
import { articleTags, normalizeArticleUrl } from '@/lib/articles'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../api/router'
import './articles.css'

type Article = inferRouterOutputs<AppRouter>['articles']['list'][number]
type Filter = 'all' | 'starred'
type Draft = Pick<Article, 'title' | 'url' | 'note' | 'description' | 'cover' | 'read' | 'starred'> & { id?: string; tagsText: string }
const blank = (): Draft => ({ title: '', url: '', note: '', description: '', cover: '', read: false, starred: false, tagsText: '' })
const filters = [
  { id: 'all', label: '全部文章', icon: Inbox },
  { id: 'starred', label: '星标', icon: Star },
] as const
const source = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '网页' } }
const dateLabel = (date: Date) => new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
function examples(): Article[] {
  return [
    { title: '建立自己的知识体系，从有意识地收藏开始', url: 'https://sspai.com/', description: '让阅读留下痕迹，把零散的信息变成属于自己的知识。', note: '试试文章里的每周回顾方法。', tags: ['知识管理', '生活'], starred: true, read: false },
    { title: '好的设计，是让复杂的事情变得简单', url: 'https://www.nngroup.com/articles/', description: '从日常产品中，重新认识信息层级与交互设计。', note: '', tags: ['设计'], starred: false, read: false },
    { title: 'React：用组件思考你的用户界面', url: 'https://zh-hans.react.dev/learn/thinking-in-react', description: '把界面拆解为组件，找到最小且完整的状态表达。', note: '下次做新功能时再读一遍。', tags: ['技术', '设计'], starred: true, read: false },
    { title: '慢一点，找到适合自己的工作节奏', url: 'https://www.calnewport.com/', description: '为真正重要的事情，留出一段不被打扰的时间。', note: '', tags: ['生活'], starred: false, read: false },
    { title: 'MDN Web 文档：理解浏览器与网页', url: 'https://developer.mozilla.org/zh-CN/docs/Web', description: '关于 Web 开发的开放知识，值得常常回来看看。', note: '', tags: ['技术'], starred: false, read: true },
  ].map((a, i) => ({ ...a, id: `example-${i}`, userId: 0, cover: '', createdAt: new Date(Date.now() - i * 86400000), updatedAt: new Date() }))
}

export function ArticleLibrary() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener('open-article-library', show)
    return () => window.removeEventListener('open-article-library', show)
  }, [])
  const [filter, setFilter] = useState<Filter>('all')
  const [tag, setTag] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [demo, setDemo] = useState<Article[] | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fetching, setFetching] = useState(false)
  const [bulkTags, setBulkTags] = useState<string | null>(null)
  const [deleted, setDeleted] = useState<Article[] | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const metaRequest = useRef(0)
  useEffect(() => () => { clearTimeout(timer.current); metaRequest.current++ }, [])
  const utils = trpc.useUtils()
  const list = trpc.articles.list.useQuery(undefined, { refetchOnWindowFocus: true })
  const save = trpc.articles.save.useMutation()
  const update = trpc.articles.update.useMutation()
  const remove = trpc.articles.delete.useMutation()
  const pending = save.isPending || update.isPending || remove.isPending
  const articles = useMemo(() => demo ?? list.data ?? [], [demo, list.data])
  const tags = useMemo(() => [...new Set(articles.flatMap(a => a.tags))].sort(), [articles])
  const visible = useMemo(() => {
    const text = query.trim().toLocaleLowerCase()
    return articles.filter(a =>
      (filter === 'all' || (filter === 'starred' && a.starred)) &&
      (!tag || a.tags.includes(tag)) &&
      (!text || [a.title, a.url, a.note, ...a.tags].join(' ').toLocaleLowerCase().includes(text)),
    ).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'zh-CN') : (sort === 'oldest' ? 1 : -1) * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
  }, [articles, filter, tag, query, sort])

  function notify(text: string, undoItems: Article[] | null = null) {
    setDeleted(undoItems)
    setMessage(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { setMessage(''); setDeleted(null) }, 8000)
  }
  function edit(article?: Article) {
    metaRequest.current++
    setFetching(false)
    setError('')
    setDraft(article ? { ...article, tagsText: article.tags.join('，') } : blank())
  }
  async function refresh() { await utils.articles.list.invalidate() }
  async function patch(ids: string[], values: { starred?: boolean; tags?: string[] }) {
    setError('')
    try {
      if (demo) setDemo(demo.map(a => ids.includes(a.id) ? { ...a, ...values } : a))
      else { await update.mutateAsync({ ids, ...values }); await refresh() }
      setSelected([])
    } catch { setError('修改未保存，请重试。') }
  }
  async function deleteArticles(ids: string[]) {
    const snapshot = articles.filter(a => ids.includes(a.id))
    setError('')
    try {
      if (demo) setDemo(demo.filter(a => !ids.includes(a.id)))
      else { await remove.mutateAsync({ ids }); await refresh() }
      if (draft?.id && ids.includes(draft.id)) setDraft(null)
      setSelected([])
      notify(`已删除 ${snapshot.length} 篇文章`, snapshot)
    } catch { setError('删除失败，请重试。') }
  }
  async function undo() {
    if (!deleted) return
    try {
      if (demo) setDemo([...demo, ...deleted])
      else {
        for (const article of deleted) await save.mutateAsync({ ...article })
        await refresh()
      }
      setDeleted(null)
      notify('已恢复文章')
    } catch { setError('恢复未完成，请重试。'); await refresh() }
  }
  const draftUrl = draft?.url
  const draftId = draft?.id
  useEffect(() => {
    if (!draftUrl || draftId) return
    try { const parsed = new URL(/^https?:\/\//i.test(draftUrl) ? draftUrl : `https://${draftUrl}`); if (!parsed.hostname.includes('.')) return; normalizeArticleUrl(draftUrl) } catch { return }
    const timeout = setTimeout(() => { void fetchInfo() }, 650)
    return () => clearTimeout(timeout)
    // Fetch only when the link changes, not while editing the populated fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftUrl, draftId])

  async function fetchInfo() {
    if (!draft) return
    let url: string
    try { url = normalizeArticleUrl(draft.url) } catch { setError('请输入有效的文章链接'); return }
    const request = ++metaRequest.current
    setFetching(true)
    setError('')
    try {
      const meta = await utils.siteMeta.fetchInfo.fetch({ url })
      if (request !== metaRequest.current) return
      setDraft(current => current ? { ...current, url, title: ('articleTitle' in meta ? meta.articleTitle : '') || current.title || source(url), description: meta.description || current.description, cover: ('cover' in meta ? meta.cover : '') || current.cover } : null)
      if (!meta.ok) setError('暂时无法获取网页信息，你仍可以填写标题并保存。')
    } catch { if (request === metaRequest.current) setError('网页信息获取失败，你仍可以手动填写并保存。') }
    finally { if (request === metaRequest.current) setFetching(false) }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!draft) return
    setError('')
    try {
      const url = normalizeArticleUrl(draft.url)
      const duplicate = articles.find(a => a.url === url && a.id !== draft.id)
      if (duplicate) { setError('这篇文章已收藏。已打开已有文章，可直接编辑。'); setDraft({ ...duplicate, tagsText: duplicate.tags.join('，') }); return }
      const { tagsText, ...rest } = draft
      const values = { ...rest, title: draft.title.trim(), url, tags: articleTags(tagsText) }
      if (demo && draft.id) setDemo(demo.map(a => a.id === draft.id ? { ...a, ...values } : a))
      else {
        await save.mutateAsync(values)
        setDemo(null)
        await refresh()
      }
      setDraft(null)
      notify(demo && draft.id ? '示例已更新，不会保存到账号' : '文章已保存')
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败，请重试。') }
  }
  function changeFilter(value: Filter, nextTag = '') { setFilter(value); setTag(nextTag); setSelected([]) }
  const selectedVisible = selected.filter(id => visible.some(a => a.id === id))
  const counts = { all: articles.length, starred: articles.filter(a => a.starred).length }

  return <>
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) { setDraft(null); metaRequest.current++; setFetching(false) } }}>
      <DialogContent className="article-library" showCloseButton={false}>
        <header className="article-header">
          <div className="article-brand"><span><BookOpen size={23} strokeWidth={1.7} /></span><div><DialogTitle>文章收藏</DialogTitle><DialogDescription className="sr-only">搜索、整理和管理账号收藏的文章</DialogDescription></div></div>
          <label className="article-search"><Search size={17} /><input aria-label="搜索文章" placeholder="搜索标题、来源、标签或备注" value={query} onChange={e => { setQuery(e.target.value); setSelected([]) }} />{query && <button aria-label="清空搜索" onClick={() => setQuery('')}><X size={15} /></button>}</label>
          <label className="article-sort"><select aria-label="文章排序" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">最新收藏</option><option value="oldest">最早收藏</option><option value="title">标题排序</option></select><ChevronDown size={14} /></label>
          <button className="article-primary" onClick={() => edit()}><Plus size={17} />收藏文章</button>
          <button className="article-icon" aria-label="关闭文章收藏" onClick={() => setOpen(false)}><X size={21} /></button>
        </header>
        <div className="article-body">
          <aside className="article-sidebar">
            <nav aria-label="文章分类">{filters.map(item => <button key={item.id} aria-current={filter === item.id && !tag ? 'page' : undefined} className={filter === item.id && !tag ? 'is-active' : ''} onClick={() => changeFilter(item.id)}><item.icon size={18} strokeWidth={1.7} /><span>{item.label}</span><small>{counts[item.id]}</small></button>)}</nav>
            <div className="article-tag-heading"><span>我的标签</span><Tag size={13} /></div>
            <nav aria-label="按标签筛选" className="article-tag-nav">{tags.map((name, i) => <button key={name} className={tag === name ? 'is-active' : ''} aria-current={tag === name ? 'page' : undefined} onClick={() => changeFilter('all', name)}><i style={{ background: ['#759a87', '#b18ab8', '#c5a16b', '#6d97b0'][i % 4] }} /><span>{name}</span><small>{articles.filter(a => a.tags.includes(name)).length}</small></button>)}{!tags.length && <p>收藏时添加标签，<br />让内容更好找。</p>}</nav>

          </aside>
          <main className="article-main">
            {demo && <div className="article-demo"><span>正在体验示例 · 内容不会保存到账号</span><button onClick={() => { metaRequest.current++; setFetching(false); setDemo(null); setDraft(null); setSelected([]); setTag(''); setDeleted(null); setMessage(''); setError('') }}>退出示例</button></div>}
            <div className="article-list-heading"><div><h2>{tag || filters.find(f => f.id === filter)?.label}<span>{visible.length} 篇</span></h2></div></div>
            {error && !draft && <div className="article-error" role="alert">{error}<button onClick={() => setError('')} aria-label="关闭错误提示"><X size={14} /></button></div>}
            {selectedVisible.length > 0 && <div className="article-bulk" role="toolbar" aria-label="批量操作文章"><span>已选 {selectedVisible.length} 篇</span><button disabled={pending} onClick={() => setBulkTags('')}>添加标签</button><button disabled={pending} onClick={() => void deleteArticles(selectedVisible)}>删除</button><button onClick={() => { setSelected([]); setBulkTags(null) }}>取消</button></div>}
            {selectedVisible.length > 0 && bulkTags !== null && <form className="article-bulk-tags" onSubmit={e => { e.preventDefault(); const newTags = articleTags(bulkTags); void (async () => { for (const id of selectedVisible) { const a = articles.find(a => a.id === id); if (a) await patch([id], { tags: [...new Set([...a.tags, ...newTags])].slice(0, 12) }) } setBulkTags(null) })() }}><label>添加标签<input value={bulkTags} onChange={e => setBulkTags(e.target.value)} placeholder="多个标签用逗号分隔" /></label><button className="article-primary" disabled={pending}>添加</button><button type="button" onClick={() => setBulkTags(null)}>取消</button></form>}
            <div className="article-list">
              {list.isLoading && !demo ? <div className="article-empty" role="status"><Loader2 className="animate-spin" size={25} /><h3>正在加载文章…</h3></div> : list.isError && !demo ? <div className="article-empty"><Inbox size={32} /><h3>文章暂时没有加载成功</h3><p>请检查连接后再试一次。</p><button className="article-primary" onClick={() => void list.refetch()}>重新加载</button></div> : visible.length ? <>
                <div className="article-table-label"><label><input type="checkbox" aria-label="选择当前列表前 100 篇文章" checked={visible.slice(0, 100).every(a => selected.includes(a.id))} onChange={e => setSelected(e.target.checked ? visible.slice(0, 100).map(a => a.id) : [])} /><span>文章</span></label><span>收藏时间</span></div>
                {visible.map(article => <article className={`article-row ${selected.includes(article.id) ? 'is-selected' : ''}`} key={article.id}>
                  <input type="checkbox" aria-label={`选择 ${article.title}`} checked={selected.includes(article.id)} onChange={e => setSelected(e.target.checked ? [...selected, article.id].slice(0, 100) : selected.filter(id => id !== article.id))} />
                  <FaviconImg url={article.url} name={source(article.url)} size={40} className="article-site-icon" /><div className="article-row-content"><a title={article.title} className="article-title" href={article.url} target="_blank" rel="noopener noreferrer"><span>{article.title}</span><ExternalLink size={13} /></a>{article.note ? <p className="article-note">{article.note}</p> : article.description && <p className="article-description">{article.description}</p>}</div>
                  {article.cover && <img className="article-cover" src={article.cover} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none' }} />}
                  <div className="article-row-info"><div className="article-meta">{article.tags.map(t => <button key={t} onClick={() => changeFilter('all', t)}>{t}</button>)}</div><time dateTime={new Date(article.createdAt).toISOString()}>{dateLabel(article.createdAt)}</time></div>
                  <div className="article-row-actions"><button className={`article-icon ${article.starred ? 'is-starred' : ''}`} disabled={pending} aria-label={article.starred ? `取消星标 ${article.title}` : `星标 ${article.title}`} onClick={() => void patch([article.id], { starred: !article.starred })}><Star size={18} fill={article.starred ? 'currentColor' : 'none'} /></button><button className="article-icon" aria-label={`编辑 ${article.title}`} onClick={() => edit(article)}><MoreHorizontal size={20} /></button></div>
                </article>)}
                <div className="article-list-end">已显示全部 {visible.length} 篇文章</div>
              </> : <div className="article-empty"><div className="article-empty-icon"><BookOpen size={35} strokeWidth={1.2} /></div><h3>{query || tag ? '没有找到匹配的文章' : articles.length ? '这里还没有文章' : '好文章，值得留一份'}</h3><p>{query || tag ? '试试其他关键词，或者清除筛选条件。' : '粘贴一个链接，把下一次阅读留给自己。'}</p>{query || tag ? <button className="article-primary" onClick={() => { setQuery(''); changeFilter('all') }}>清除筛选</button> : <button className="article-primary" onClick={() => edit()}><Plus size={16} />收藏第一篇文章</button>}{!articles.length && <button className="article-text-button" onClick={() => { setDeleted(null); setMessage(''); setDemo(examples()); changeFilter('all') }}>先看看示例效果</button>}</div>}
            </div>
            <footer className="article-footer"><span><span className="article-status-dot" />{demo ? '示例预览' : pending ? '正在保存…' : ''}</span><span>共 {articles.length} 篇收藏</span></footer>
          </main>
          {draft && <section className="article-editor" aria-label={draft.id ? '编辑文章' : '收藏文章'}>
            <div className="article-editor-heading"><div><h2>{draft.id ? '文章详情' : '收藏一篇好文章'}</h2><p>{draft.id ? '为这篇文章留下一点线索。' : '先收好，等有空再慢慢读。'}</p></div><button className="article-icon" aria-label="关闭文章详情" onClick={() => { metaRequest.current++; setFetching(false); setDraft(null); setError('') }}><X size={19} /></button></div>
            <form onSubmit={e => void submit(e)}>
              <label>文章链接<div className="article-url-field"><input required maxLength={2048} placeholder="粘贴文章链接" value={draft.url} onChange={e => { metaRequest.current++; setFetching(false); setDraft({ ...draft, url: e.target.value }) }} /><button type="button" disabled={fetching || !draft.url} onClick={() => void fetchInfo()}>{fetching ? <Loader2 size={15} className="animate-spin" /> : '获取信息'}</button></div></label>
              <label>标题<input required maxLength={300} placeholder="给文章起个容易找到的名字" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
              <label>简介<textarea rows={3} maxLength={2000} placeholder="自动获取文章简介，也可手动填写" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
              <label>标签<input maxLength={400} placeholder="例如：技术，设计，生活" value={draft.tagsText} onChange={e => setDraft({ ...draft, tagsText: e.target.value })} /><small>多个标签用逗号分隔，最多 12 个。</small></label>
              <label>我的备注<textarea rows={4} maxLength={5000} placeholder="为什么收藏它？有什么值得记住？" value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} /></label>
              <div className="article-editor-toggles"><label><input type="checkbox" checked={draft.starred} onChange={e => setDraft({ ...draft, starred: e.target.checked })} /><Star size={16} />星标收藏</label></div>
              {error && <div className="article-error" role="alert">{error}</div>}
              <button className="article-primary article-save" disabled={pending || fetching}>{pending ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}{draft.id ? '保存修改' : '保存文章'}</button>
              {draft.id && <div className="article-editor-bottom"><a href={draft.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />打开原文</a><button type="button" disabled={pending} onClick={() => void deleteArticles([draft.id!])}><Trash2 size={15} />删除文章</button></div>}
              {!draft.id && <p className="article-editor-hint"><FileText size={14} />保存文章链接，阅读时打开原网页。</p>}
            </form>
          </section>}
        </div>
        {message && <div className="article-toast" role="status"><Check size={16} />{message}{deleted && <button disabled={pending} onClick={() => void undo()}>撤销</button>}<button aria-label="关闭提示" onClick={() => { setMessage(''); setDeleted(null) }}><X size={15} /></button></div>}
      </DialogContent>
    </Dialog>
  </>
}
