import { SITE, isWebUrl } from './shared'
import type { Page } from './shared'

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })
  chrome.contextMenus.removeAll(() => chrome.contextMenus.create({ id: 'dandan-save', title: '保存书签', contexts: ['page', 'link'], documentUrlPatterns: ['http://*/*', 'https://*/*'] }))
})
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'dandan-save') return
  const url = info.linkUrl || info.pageUrl || tab?.url
  if (!isWebUrl(url)) return
  const page: Page = { url, title: info.linkUrl ? url : tab?.title || url, icon: !info.linkUrl && isWebUrl(tab?.favIconUrl) ? tab.favIconUrl : undefined }
  const id = crypto.randomUUID()
  void chrome.storage.session.set({ [`page:${id}`]: page }).then(() => chrome.windows.create({ url: chrome.runtime.getURL(`index.html?capture=${id}`), type: 'popup', width: 440, height: 650 })).catch(console.error)
})

const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
async function login() {
  const verifier = base64(crypto.getRandomValues(new Uint8Array(32)))
  const state = base64(crypto.getRandomValues(new Uint8Array(32)))
  const challenge = base64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
  const redirectUri = chrome.identity.getRedirectURL('dandan')
  const authorize = new URL(`${SITE}/extension/authorize`)
  authorize.search = new URLSearchParams({ redirect_uri: redirectUri, code_challenge: challenge, state }).toString()
  const response = await chrome.identity.launchWebAuthFlow({ url: authorize.href, interactive: true })
  if (!response) throw new Error('授权未完成，请重试')
  const callback = new URL(response)
  if (callback.origin + callback.pathname !== redirectUri || callback.searchParams.get('state') !== state) throw new Error('授权校验失败，请重新登录')
  if (callback.searchParams.has('error')) throw new Error('已取消授权')
  const code = callback.searchParams.get('code')
  if (!code) throw new Error('授权未完成，请重试')
  const result = await fetch(`${SITE}/api/extension/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, verifier, redirectUri }), signal: AbortSignal.timeout(20000) })
  const body = await result.json()
  if (!result.ok) throw new Error(body.error || '授权失败')
  await chrome.storage.local.set({ session: { token: body.token, expiresAt: body.expiresAt } })
}
let loggingIn = false
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || message?.type !== 'login') return
  if (loggingIn) { reply({ error: '授权正在进行，请完成登录窗口中的操作' }); return }
  loggingIn = true
  login().then(() => reply({ ok: true })).catch(e => reply({ error: e instanceof Error ? e.message : '授权未完成，请重试' })).finally(() => { loggingIn = false })
  return true
})
