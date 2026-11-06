import { useMemo, useState } from 'react'
import { faviconCandidates, hostColor, hostLetter } from '@/lib/favicon'

interface Props {
  url: string
  name: string
  customIcon?: string
  size?: number
  className?: string
}

/** favicon 多源级联加载，全部失败时退化为字母色块 */
export function FaviconImg({ url, name, customIcon, size = 44, className = '' }: Props) {
  const candidates = useMemo(() => {
    if (!customIcon) return faviconCandidates(url)
    // 裸 favicon.ico 通常只有 16/32px，放大后模糊：优先用图标服务的大图，ico 只作兜底
    const weakIco = /\/favicon\.ico(\?|#|$)/i.test(customIcon)
    return weakIco ? [...faviconCandidates(url), customIcon] : [customIcon, ...faviconCandidates(url)]
  }, [url, customIcon])
  const [idx, setIdx] = useState(0)

  if (idx >= candidates.length) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl text-white font-semibold select-none ${className}`}
        style={{ width: size, height: size, background: hostColor(url), fontSize: size * 0.44 }}
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
      className={`rounded-xl object-cover bg-white ${className}`}
      style={{ width: size, height: size }}
      onError={() => setIdx((i) => i + 1)}
      loading="lazy"
    />
  )
}
