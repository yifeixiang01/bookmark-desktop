import { useMemo, useState } from 'react'
import { faviconCandidates, hostLetter } from '@/lib/favicon'

const workingSources = new Map<string, string>()

interface Props {
  url: string
  name: string
  customIcon?: string
  size?: number
  className?: string
}

/** favicon 多源级联加载，全部失败时退化为字母色块 */
export function FaviconImg({ url, name, customIcon, size = 44, className = '' }: Props) {
  const sourceKey = JSON.stringify([url, customIcon])
  return <FaviconLoader key={sourceKey} sourceKey={sourceKey} {...{ url, name, customIcon, size, className }} />
}

function FaviconLoader({ url, name, customIcon, size = 44, className = '', sourceKey }: Props & { sourceKey: string }) {
  const candidates = useMemo(() => {
    const known = workingSources.get(sourceKey)
    return [...new Set([known, customIcon, ...faviconCandidates(url)].filter((src): src is string => !!src))]
  }, [url, customIcon, sourceKey])
  const [idx, setIdx] = useState(0)

  if (idx >= candidates.length) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 font-semibold select-none ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.44 }}
      >
        {hostLetter(url, name)}
      </div>
    )
  }
  return (
    <img
      src={candidates[idx]}
      alt={name}
      draggable={false}
      className={`rounded-xl object-contain ${className}`}
      style={{ width: size, height: size, backgroundColor: 'transparent' }}
      onError={() => setIdx((i) => Math.min(i + 1, candidates.length))}
      onLoad={() => workingSources.set(sourceKey, candidates[idx])}
      loading="lazy"
      decoding="async"
    />
  )
}
