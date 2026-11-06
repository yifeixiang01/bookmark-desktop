import { useEffect, useRef, useState } from 'react'
import { trpc } from '@/providers/trpc'
import type { AppState } from '@/types/bookmark'
import { parseStateJSON } from '@/lib/store'

/**
 * 云端同步：
 * - 登录后先拉取云端状态；有则覆盖本地，没有则把当前本地上传（完成老用户迁移）
 * - 之后每次本地变更防抖 800ms 整包上传
 * - hydrated 为 false 期间页面应显示加载态，避免本地种子数据误覆盖云端
 */
export function useCloudSync(
  state: AppState,
  replaceState: (s: AppState) => void,
  enabled: boolean
) {
  const [hydrated, setHydrated] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const skipNextPush = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saveMut = trpc.state.save.useMutation()
  const saveRef = useRef(saveMut.mutate)
  saveRef.current = saveMut.mutate
  const replaceRef = useRef(replaceState)
  replaceRef.current = replaceState

  const getQuery = trpc.state.get.useQuery(undefined, {
    enabled,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  // 初始水合：拉云端 → 覆盖本地；云端为空 → 上传本地
  useEffect(() => {
    if (!enabled || hydrated || !getQuery.isSuccess) return
    const remote = getQuery.data
    const parsed = remote ? parseStateJSON(JSON.stringify(remote)) : null
    skipNextPush.current = true // 水合引发的状态变化不再回传
    if (parsed) {
      replaceRef.current(parsed)
      setHydrated(true)
    } else {
      // 新账号（或云端数据损坏）：把当前本地数据上传作为初始版本
      setSyncing(true)
      saveRef.current(
        { state: JSON.parse(JSON.stringify(state)) as never },
        { onSettled: () => { setSyncing(false); setHydrated(true) } }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hydrated, getQuery.isSuccess, getQuery.data])

  // 本地变更 → 防抖上传
  useEffect(() => {
    if (!hydrated) return
    if (skipNextPush.current) {
      skipNextPush.current = false
      return
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setSyncing(true)
      saveRef.current(
        { state: JSON.parse(JSON.stringify(state)) as never },
        { onSettled: () => setSyncing(false) }
      )
    }, 800)
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, hydrated])

  // 401 说明会话刚失效（如退出登录瞬间的 refetch），由路由守卫接管跳转，不当作加载失败
  const unauthorized =
    getQuery.error && (getQuery.error as { data?: { code?: string } }).data?.code === 'UNAUTHORIZED'

  return {
    hydrated,
    syncing,
    loadError: enabled && getQuery.isError && !unauthorized,
    retryLoad: getQuery.refetch,
  }
}
