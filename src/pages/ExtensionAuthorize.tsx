import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function ExtensionAuthorize() {
  const { user, isLoading } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const params = new URLSearchParams(location.search)
  const redirectUri = params.get('redirect_uri') || ''
  const challenge = params.get('code_challenge') || ''
  const state = params.get('state') || ''
  let valid = false
  try { const url = new URL(redirectUri); valid = url.protocol === 'https:' && /^[a-p]{32}\.chromiumapp\.org$/.test(url.hostname) && url.pathname === '/dandan' && !url.search && !url.hash && !url.port && !url.username && !url.password && /^[A-Za-z0-9_-]{43}$/.test(challenge) && /^[A-Za-z0-9_-]{32,128}$/.test(state) } catch { /* invalid URL */ }
  async function approve() {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/extension/authorize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ redirectUri, challenge, state }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      location.assign(result.redirect)
    } catch (e) { setError(e instanceof Error ? e.message : '授权失败，请重试'); setBusy(false) }
  }
  const returnTo = `/extension/authorize${location.search}`
  return <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white"><section className="w-full max-w-md rounded-3xl bg-white/10 p-8 space-y-5">
    <div className="text-3xl font-bold">Stashy</div><h1 className="text-xl">授权浏览器插件</h1>
    {!valid ? <p>授权链接无效，请从 Stashy 插件重新发起登录。</p> : isLoading ? <p>正在确认账号…</p> : !user ? <><p>登录后，Stashy 可以读取你的空间，并将收藏保存到你的账号。</p><a className="block rounded-xl bg-white p-3 text-center text-slate-900" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>前往邮箱登录</a><p className="text-sm text-white/60">没有账号？请在本站注册，完成后返回插件继续授权。</p></> : <>
    <p>当前账号：{user.email || user.name}</p><p className="text-white/70">允许 Stashy 查看空间列表并保存书签。插件不会获取你的密码，也不会自动读取浏览历史。</p>
    <p className="break-all text-xs text-white/50">插件 ID：{new URL(redirectUri).hostname.split('.')[0]}</p>
    <button disabled={busy} className="w-full rounded-xl bg-white p-3 text-slate-900 disabled:opacity-50" onClick={approve}>{busy ? '正在授权…' : '同意并返回 Stashy'}</button>
    <a className="block text-center text-white/60" href={valid ? `${redirectUri}?error=access_denied&state=${encodeURIComponent(state)}` : '/'}>取消授权</a></>}
    {error && <p role="alert" className="text-red-300">{error}</p>}
  </section></main>
}
