import { useState } from 'react'
import { Search } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const ENGINES: Record<string, { name: string; url: (q: string) => string }> = {
  baidu: { name: '百度', url: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}` },
  bing: { name: '必应', url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  google: { name: 'Google', url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  zhihu: { name: '知乎', url: (q) => `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(q)}` },
}

interface Props {
  engine: string
  onEngineChange: (e: string) => void
}

export function SearchBar({ engine, onEngineChange }: Props) {
  const [q, setQ] = useState('')
  const current = ENGINES[engine] ?? ENGINES.baidu

  const go = () => {
    const query = q.trim()
    if (!query) return
    if (/^https?:\/\//.test(query)) window.open(query, '_blank')
    else window.open(current.url(query), '_blank')
  }

  return (
    <div className="flex w-full max-w-xl items-center rounded-full bg-white/90 shadow-lg shadow-black/10 backdrop-blur-md border border-white/50 focus-within:bg-white transition-colors">
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
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && go()}
        placeholder="搜索，或直接输入网址"
        className="flex-1 bg-transparent px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
      />
      <button
        onClick={go}
        className="m-1 flex items-center gap-1.5 rounded-full bg-slate-800 px-5 py-2 text-sm text-white hover:bg-slate-700 transition-colors"
      >
        <Search size={15} />
        搜索
      </button>
    </div>
  )
}
