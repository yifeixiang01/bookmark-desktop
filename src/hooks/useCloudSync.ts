import { useEffect, useRef, useState } from 'react'
import { trpc } from '@/providers/trpc'
import type { AppState } from '@/types/bookmark'
import { parseStateJSON } from '@/lib/store'

/** Serialize writes; revision checks prevent a stale desktop overwriting extension saves. */
export function useCloudSync(state: AppState, replaceState: (s: AppState) => void, userId: number | undefined) {
  const utils = trpc.useUtils()
  const save = trpc.state.save.useMutation()
  const latest = useRef({ state, replaceState, utils, mutate: save.mutateAsync })
  latest.current = { state, replaceState, utils, mutate: save.mutateAsync }
  const [status, setStatus] = useState({ hydrated: false, syncing: false, loadError: false, error: '' })
  const controller = useRef<{ retry: () => void }>({ retry: () => {} })

  useEffect(() => {
    if (!userId) return
    let disposed = false, busy = false, stopped = false, revision = 0
    let baseline = ''
    setStatus({ hydrated: false, syncing: false, loadError: false, error: '' })
    const update = (patch: Partial<typeof status>) => { if (!disposed) setStatus(s => ({ ...s, ...patch })) }
    async function load(initial = false) {
      if (busy || stopped || disposed) return
      if (!initial && JSON.stringify(latest.current.state) !== baseline) return
      busy = true
      try {
        const snapshot = await latest.current.utils.state.snapshot.fetch()
        if (disposed) return
        // A user may edit while the read is in flight. Keep their edits for CAS save.
        if (!initial && JSON.stringify(latest.current.state) !== baseline) return
        revision = snapshot.revision
        const parsed = snapshot.state ? parseStateJSON(JSON.stringify(snapshot.state)) : null
        if (snapshot.state && !parsed) throw new Error('云端数据无法读取')
        const next = parsed ?? latest.current.state
        baseline = JSON.stringify(next)
        if (parsed) latest.current.replaceState(parsed)
        else {
          const result = await latest.current.mutate({ state: next, expectedRevision: revision })
          revision = result.revision
        }
        update({ hydrated: true, loadError: false, error: '' })
      } catch {
        update({ loadError: initial, error: initial ? '' : '云端读取失败，将在下次切回时重试' })
      } finally { busy = false }
    }
    async function flush() {
      if (busy || stopped || disposed || !baseline) return
      const local = latest.current.state
      const json = JSON.stringify(local)
      if (json === baseline) return
      busy = true
      update({ syncing: true })
      try {
        const result = await latest.current.mutate({ state: local, expectedRevision: revision })
        if (disposed) return
        revision = result.revision
        baseline = json
        update({ error: '' })
      } catch (error) {
        const code = (error as { data?: { code?: string } }).data?.code
        if (code === 'CONFLICT' || code === 'UNAUTHORIZED') stopped = true
        update({ error: code === 'CONFLICT' ? '云端已有新修改，本地修改尚未上传。请先导出本地备份，再刷新页面获取云端数据。' : code === 'UNAUTHORIZED' ? '登录已失效，请重新登录；本地修改尚未上传。' : '同步失败，本地修改已保留，正在等待重试。' })
      } finally {
        busy = false
        update({ syncing: false })
      }
    }
    controller.current.retry = () => { void load(true) }
    void load(true)
    const tick = () => { void flush() }
    const timer = setInterval(tick, 1000)
    const focus = () => { if (JSON.stringify(latest.current.state) === baseline) void load(); else void flush() }
    window.addEventListener('focus', focus)
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (baseline && JSON.stringify(latest.current.state) !== baseline) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => { disposed = true; clearInterval(timer); window.removeEventListener('focus', focus); window.removeEventListener('beforeunload', beforeUnload) }
  }, [userId])
  return { ...status, retryLoad: () => controller.current.retry() }
}
