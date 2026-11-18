import { useMemo, useState } from 'react'
import type { Partition } from '@/types/bookmark'
import { searchBookmarks } from '@/lib/searchBookmarks'
import { Search } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ENGINES: Record<string, { name: string; url: (q: string) => string }> = {
  baidu: { name: '百度', url: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}` },
  bing: { name: '必应', url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  google: { name: 'Google', url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  zhihu: { name: '知乎', url: (q) => `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(q)}` },
}

interface Props {
  engine: string
  partitions: Partition[]
  onEngineChange: (e: string) => void
}

export function SearchBar({ engine, onEngineChange, partitions }: Props) {
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(-1)
  const results = useMemo(() => searchBookmarks(partitions, q), [partitions, q])
  const showResults = focused && q.trim().length > 0
  const current = ENGINES[engine] ?? ENGINES.baidu

  const go = () => {
    const query = q.trim()
    if (!query) return
    if (/^https?:\/\//.test(query)) window.open(query, '_blank')
    else window.open(current.url(query), '_blank')
  }

  return (
    <div className="relative z-30 w-full max-w-xl" onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
    }}>
    <div className="flex w-full items-center rounded-full bg-white/90 shadow-lg shadow-black/10 backdrop-blur-md border border-white/50 focus-within:bg-white transition-colors">
      <DropdownMenu>
        <DropdownMenuTrigger className="pl-5 pr-2 py-3 text-sm text-slate-500 hover:text-slate-800 outline-none whitespace-nowrap">
          {current.name} ▾
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {Object.entries(ENGINES).map(([key, e]) => (
            <DropdownMenuItem key={key} onSelect={() => onEngineChange(key)}>
              {e.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="w-px h-5 bg-slate-200" />
      <input
        id="global-search-input"
        value={q}
        onChange={(e) => { setQ(e.target.value); setActive(-1); setFocused(true) }}
        onFocus={() => setFocused(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setFocused(false); setActive(-1) }
          else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && results.length) {
            e.preventDefault()
            setFocused(true)
            const next = e.key === 'ArrowDown' ? (active + 1) % results.length : (active <= 0 ? results.length - 1 : active - 1)
            setActive(next)
            document.getElementById(`bookmark-search-${next}`)?.scrollIntoView({ block: 'nearest' })
          } else if (e.key === 'Enter') {
            if (showResults && active >= 0 && results[active]) {
              window.open(results[active].bookmark.url, '_blank', 'noopener,noreferrer')
              setFocused(false)
            } else go()
          }
        }}
        role="combobox"
        aria-label="搜索所有空间的书签或搜索网页"
        aria-expanded={showResults}
        aria-controls="bookmark-search-results"
        aria-autocomplete="list"
        aria-activedescendant={showResults && active >= 0 ? `bookmark-search-${active}` : undefined}
        placeholder="搜索所有空间书签，或输入网址"
        className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
      />
      <button
        onClick={go}
        className="m-1 flex items-center gap-1.5 rounded-full bg-slate-800 px-5 py-2 text-sm text-white hover:bg-slate-700 transition-colors"
      >
        <Search size={15} />
        搜索
      </button>
    </div>
    {showResults && (
      <div className="result-list-in absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <p className="border-b px-4 py-2 text-xs text-slate-400" aria-live="polite">所有空间 · {results.length} 个匹配书签</p>
        <ul id="bookmark-search-results" role="listbox" className="max-h-72 overflow-y-auto p-1.5">
          {results.map(({ spaceId, spaceName, bookmark }, index) => {
            let domain = bookmark.url
            try { domain = new URL(bookmark.url).hostname } catch { /* 保留原始链接 */ }
            return <li className="result-list-item" key={`${spaceId}-${bookmark.id}-${index}`} role="option" id={`bookmark-search-${index}`} aria-selected={active === index}>
              <a href={bookmark.url} target="_blank" rel="noopener noreferrer" onClick={() => setFocused(false)} className={`block truncate rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 ${active === index ? 'bg-slate-100' : ''}`} title={`${spaceName} · ${bookmark.name}（${domain}）`}>
                <span className="text-slate-400">{spaceName}</span> · {bookmark.name}<span className="text-slate-400">（{domain}）</span>
              </a>
            </li>
          })}
        </ul>
        {!results.length && <p className="px-4 pb-4 pt-2 text-sm text-slate-400">没有匹配的书签，可点击搜索进行网页搜索</p>}
      </div>
    )}
    </div>
  )
}
