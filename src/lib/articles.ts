export function normalizeArticleUrl(value: string) {
  if (/^[a-z][a-z\d+.-]*:/i.test(value.trim()) && !/^https?:\/\//i.test(value.trim())) throw new Error('请输入有效的 HTTP 或 HTTPS 链接')
  const url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`)
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('请输入有效的 HTTP 或 HTTPS 链接')
  url.hash = ''
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || ['fbclid', 'gclid'].includes(key)) url.searchParams.delete(key)
  }
  return url.toString()
}

export function articleTags(value: string) {
  return [...new Set(value.split(/[,，、\n]/).map(t => t.trim()).filter(Boolean))].slice(0, 12).map(t => t.slice(0, 30))
}
