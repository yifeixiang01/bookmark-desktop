import { useRef, useState } from 'react'

export function useSyncedLogout(flush: () => Promise<boolean>, logout: () => Promise<unknown>, onError: (message: string) => void) {
  const [exiting, setExiting] = useState(false)
  const pending = useRef(false)
  const exit = async () => {
    if (pending.current) return
    pending.current = true; setExiting(true)
    try {
      if (!await flush()) { onError('退出已取消：修改尚未成功同步，请检查网络或同步提示后重试。'); return }
      await logout()
    } catch { onError('退出登录失败，请稍后重试。') }
    finally { pending.current = false; setExiting(false) }
  }
  return { exiting, exit }
}
