import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [installed, setInstalled] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)')
    const updateInstalled = () => setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    const beforeInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt) }
    const afterInstall = () => { setInstalled(true); setPrompt(null) }
    updateInstalled()
    standalone.addEventListener('change', updateInstalled)
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', afterInstall)
    return () => {
      standalone.removeEventListener('change', updateInstalled)
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', afterInstall)
    }
  }, [])

  const install = async () => {
    if (!prompt || pending) return
    setPending(true)
    try {
      await prompt.prompt()
      await prompt.userChoice
    } catch {
      // Browser menus remain available when the native prompt is unavailable.
    } finally {
      setPrompt(null)
      setPending(false)
    }
  }

  if (installed) return null
  return (
    <div className="mobile-pwa-install">
      {prompt ? (
        <button className="mobile-action-row" disabled={pending} onClick={() => void install()}>
          <span className="mobile-action-icon"><Download size={20} /></span>
          <span><strong>{pending ? '正在打开安装提示…' : '安装到主屏幕'}</strong><small>像应用一样直接打开书签桌面</small></span>
        </button>
      ) : (
        <div className="px-1 py-3 text-xs leading-6 text-[#788b7c]">
          <p className="font-medium text-[#285e50]">添加到主屏幕</p>
          <p>iPhone / iPad：在 Safari 中点分享 → 添加到主屏幕。Android：在浏览器菜单中选择安装应用或添加到主屏幕。</p>
        </div>
      )}
    </div>
  )
}
