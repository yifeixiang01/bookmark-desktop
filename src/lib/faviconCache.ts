const STORAGE_KEY = 'bookmark-favicon-sources-v1'
const MAX_SOURCES = 512
let sources: Record<string, string> | undefined
const notified = new Set<string>()

function readSources() {
  if (sources) return sources
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    sources = Object.fromEntries(Object.entries(parsed && typeof parsed === 'object' ? parsed : {})
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string').slice(-MAX_SOURCES))
  } catch { sources = {} }
  return sources
}

export function cachedFaviconSource(key: string): string | undefined {
  return readSources()[key]
}

function notifyWorker(type: 'CACHE_FAVICON' | 'REMOVE_FAVICON', url: string) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !/^https?:/i.test(url)) return
  // ready also works on the first visit, before the current page is controlled.
  void navigator.serviceWorker.ready.then((registration) => {
    const worker = registration.active
    worker?.postMessage({ type, url })
    if (worker && type === 'CACHE_FAVICON') notified.add(url)
  }).catch(() => { /* Storage is an enhancement; normal image loading still works. */ })
}

export function rememberFavicon(key: string, url: string) {
  if (!notified.has(url)) notifyWorker('CACHE_FAVICON', url)
  const known = readSources()
  if (known[key] === url) return
  delete known[key]
  known[key] = url
  const entries = Object.entries(known).slice(-MAX_SOURCES)
  sources = Object.fromEntries(entries)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sources)) } catch { /* Quota / private browsing. */ }
}

export function forgetFavicon(key: string, url: string) {
  notified.delete(url)
  const known = readSources()
  if (known[key] === url) {
    delete known[key]
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(known)) } catch { /* Optional cache. */ }
  }
  notifyWorker('REMOVE_FAVICON', url)
}
