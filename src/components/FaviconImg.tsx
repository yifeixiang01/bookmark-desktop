import { useEffect, useMemo, useState } from 'react'
import { faviconCandidates } from '@/lib/favicon'
import { cachedFaviconSource, forgetFavicon, rememberFavicon } from '@/lib/faviconCache'

const workingSources = new Map<string, string>()
const failedSources = new Map<string, number>()

interface Props {
  url: string
  name: string
  customIcon?: string
  size?: number
  className?: string
}

/** 优先复用持久缓存和成功来源，失败后切换备用地址并等待恢复重试。 */
export function FaviconImg({ url, name, customIcon, size = 44, className = '' }: Props) {
  const sourceKey = JSON.stringify([url, customIcon])
  return <FaviconLoader key={sourceKey} sourceKey={sourceKey} {...{ url, name, customIcon, size, className }} />
}

function FaviconLoader({ url, name, customIcon, size = 44, className = '', sourceKey }: Props & { sourceKey: string }) {
  const [retry, setRetry] = useState(0)
  const candidates = useMemo(() => {
    const known = workingSources.get(sourceKey) ?? cachedFaviconSource(sourceKey)
    const sources = [...new Set([known, customIcon, ...faviconCandidates(url)].filter((src): src is string => !!src))]
    const available = sources.filter(src => Date.now() - (failedSources.get(src) ?? 0) > 60_000)
    return available.length ? available : sources
  // A retry recomputes the failed-source cooldown as well.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, customIcon, sourceKey, retry])
  const [idx, setIdx] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const src = candidates[idx]
  const fail = () => {
    if (src) failedSources.set(src, Date.now())
    if (workingSources.get(sourceKey) === src) workingSources.delete(sourceKey)
    if (src) forgetFavicon(sourceKey, src)
    setLoaded(false)
    setIdx(i => i === idx ? Math.min(i + 1, candidates.length) : i)
  }
  useEffect(() => {
    // Small previews remain lazy: don't time them out before they enter view.
    if (!src || loaded || size < 40) return
    const timer = window.setTimeout(fail, 6000)
    return () => window.clearTimeout(timer)
    // Each timer belongs to a single candidate, never the next fallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, idx, loaded, size])

  useEffect(() => {
    if (idx < candidates.length) return
    const restart = () => {
      if (document.visibilityState === 'hidden' || !navigator.onLine) return
      setLoaded(false)
      setIdx(0)
      setRetry((value) => value + 1)
    }
    const onVisible = () => { if (document.visibilityState === 'visible') restart() }
    const timer = window.setTimeout(restart, Math.min(60_000 * 2 ** Math.min(retry, 4), 900_000))
    window.addEventListener('online', restart)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('online', restart)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [idx, candidates.length, retry])

  if (idx >= candidates.length) {
    return (
      <div
        aria-label={name}
        className={`rounded-xl border border-slate-200 bg-white select-none ${className}`}
        style={{ width: size, height: size, backgroundColor: '#fff' }}
      />
    )
  }
  return (
    <img
      key={src}
      src={src}
      alt=""
      role="img"
      aria-label={name}
      draggable={false}
      className={`rounded-xl object-contain bg-white ${className}`}
      style={{ width: size, height: size, backgroundColor: '#fff' }}
      onError={fail}
      onLoad={() => { setLoaded(true); failedSources.delete(src); workingSources.set(sourceKey, src); rememberFavicon(sourceKey, src) }}
      loading={size >= 40 ? 'eager' : 'lazy'}
      fetchPriority="auto"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  )
}
