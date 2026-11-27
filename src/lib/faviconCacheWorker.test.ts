import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { expect, it, vi } from 'vitest'

function worker() {
  const listeners = new Map<string, (event: any) => void>()
  const entries = new Map<string, Response>()
  const keyOf = (request: string | Request) => typeof request === 'string' ? request : request.url
  const cache = {
    match: vi.fn(async (request: string | Request) => entries.get(keyOf(request))),
    put: vi.fn(async (request: string | Request, response: Response) => { entries.set(keyOf(request), response) }),
    delete: vi.fn(async (request: string | Request) => entries.delete(keyOf(request))),
    keys: async () => [...entries.keys()].map(url => new Request(url)),
  }
  const fetch = vi.fn(async () => new Response('icon', { headers: { 'content-type': 'image/png' } }))
  vm.runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), {
    self: { location: { origin: 'https://bookmarks.test' }, addEventListener: (type: string, listener: (event: any) => void) => listeners.set(type, listener) },
    caches: { open: async () => cache }, fetch, URL, AbortSignal,
  })
  const message = async (type: string, url: string) => {
    let pending: Promise<unknown> | undefined
    listeners.get('message')!({ data: { type, url }, waitUntil: (promise: Promise<unknown>) => { pending = promise } })
    await pending
  }
  return { listeners, entries, fetch, message }
}

it('persists a confirmed image and serves it without another network request', async () => {
  const w = worker()
  const url = 'https://icons.test/a.png'
  await w.message('CACHE_FAVICON', url)
  w.fetch.mockRejectedValue(new Error('offline'))
  let response: Promise<Response> | undefined
  w.listeners.get('fetch')!({ request: { url, method: 'GET', destination: 'image' }, respondWith: (promise: Promise<Response>) => { response = promise } })
  expect(await (await response!).text()).toBe('icon')
  expect(w.fetch).toHaveBeenCalledTimes(1)
})

it('removes a failed cached image so the next load can recover', async () => {
  const w = worker()
  await w.message('CACHE_FAVICON', 'https://icons.test/a.png')
  await w.message('REMOVE_FAVICON', 'https://icons.test/a.png')
  expect(w.entries.size).toBe(0)
})

it('does not store failed, non-image or API responses', async () => {
  const w = worker()
  await w.message('CACHE_FAVICON', 'https://bookmarks.test/api/private')
  expect(w.fetch).not.toHaveBeenCalled()
  w.fetch.mockResolvedValueOnce(new Response('missing', { status: 404 }))
  await w.message('CACHE_FAVICON', 'https://icons.test/missing')
  w.fetch.mockResolvedValueOnce(new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } }))
  await w.message('CACHE_FAVICON', 'https://icons.test/login')
  expect(w.entries.size).toBe(0)
})

it('bounds persisted images and keeps the newest icons', async () => {
  const w = worker()
  for (let i = 0; i < 130; i++) await w.message('CACHE_FAVICON', `https://icons.test/${i}.png`)
  expect(w.entries.size).toBe(128)
  expect(w.entries.has('https://icons.test/0.png')).toBe(false)
  expect(w.entries.has('https://icons.test/129.png')).toBe(true)
})

it('caches cross-origin images without CORS and limits opaque storage separately', async () => {
  const w = worker()
  const opaque = { type: 'opaque', ok: false } as Response
  for (let i = 0; i < 34; i++) {
    w.fetch.mockRejectedValueOnce(new Error('CORS')).mockResolvedValueOnce(opaque)
    await w.message('CACHE_FAVICON', `https://private-icons.test/${i}.png`)
  }
  expect(w.entries.size).toBe(32)
  expect(w.entries.has('https://private-icons.test/0.png')).toBe(false)
  expect(w.fetch).toHaveBeenLastCalledWith('https://private-icons.test/33.png', expect.objectContaining({ mode: 'no-cors', credentials: 'omit' }))
})
