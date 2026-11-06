// favicon 多源级联：favicon.im -> DuckDuckGo -> Google -> 字母兜底
//（Google 的 s2 服务在国内不可达，放最后；前两个国内可直连）
export function faviconCandidates(url: string): string[] {
  try {
    const host = new URL(url).hostname
    if (!host) return []
    return [
      `https://favicon.im/${host}?larger=true`,
      `https://icons.duckduckgo.com/ip3/${host}.ico`,
      `https://www.google.com/s2/favicons?domain=${host}&sz=128`,
    ]
  } catch {
    return []
  }
}

/** 域名哈希色相（0-360），同一域名恒定，用于兜底色与按颜色整理 */
export function hostHue(url: string): number {
  let host = url
  try {
    host = new URL(url).hostname
  } catch {
    /* ignore */
  }
  let h = 0
  for (let i = 0; i < host.length; i++) h = (h * 31 + host.charCodeAt(i)) >>> 0
  return h % 360
}

/** 按域名哈希出一个稳定的底色，用于图标加载失败时的字母兜底块 */
export function hostColor(url: string): string {
  return `hsl(${hostHue(url)} 45% 42%)`
}

export function hostLetter(url: string, name: string): string {
  const n = name.trim()
  if (n) return n[0].toUpperCase()
  try {
    return new URL(url).hostname.replace(/^www\./, '')[0]?.toUpperCase() ?? '?'
  } catch {
    return '?'
  }
}
