import { SITE, isWebUrl } from './shared'
import type { Page } from './shared'

const menuProperties: chrome.contextMenus.CreateProperties = {
  id: 'dandan-save', title: '保存书签',
  contexts: ['page', 'link', 'selection', 'image', 'video', 'audio', 'editable'],
  documentUrlPatterns: ['http://*/*', 'https://*/*'],
}
let menuRegistration: Promise<void> | undefined
function ensureSaveMenu() {
  if (menuRegistration) return menuRegistration
  const { id, ...properties } = menuProperties
  menuRegistration = (async () => {
    try {
      await new Promise<void>((resolve, reject) => {
        chrome.contextMenus.update(id!, properties, () => {
          const error = chrome.runtime.lastError
          if (error) reject(new Error(error.message))
          else resolve()
        })
      })
    }
    catch {
      await new Promise<void>((resolve, reject) => {
        chrome.contextMenus.create(menuProperties, () => {
          const error = chrome.runtime.lastError
          if (error) reject(new Error(error.message))
          else resolve()
        })
      })
    }
  })().catch(error => console.error('[Stashy] Unable to register save menu:', error)).finally(() => { menuRegistration = undefined })
  return menuRegistration
}
chrome.runtime.onInstalled.addListener(() => {
  void ensureSaveMenu()
  // Some Chromium environments omit this method; menu setup must not depend on it.
  if (typeof chrome.storage.local.setAccessLevel === 'function') {
    try {
      void Promise.resolve(chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }))
        .catch(error => console.warn('[Stashy] Storage access restriction unavailable:', error))
    } catch (error) { console.warn('[Stashy] Storage access restriction unavailable:', error) }
  }
})
chrome.runtime.onStartup.addListener(() => { void ensureSaveMenu() })
// Repair missing menus whenever Chrome starts the service worker, including after reloads.
void ensureSaveMenu()
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'dandan-save') return
  const url = info.linkUrl || info.pageUrl || tab?.url
  if (!isWebUrl(url)) return
  const page: Page = { url, title: info.linkUrl ? url : tab?.title || url, icon: !info.linkUrl && isWebUrl(tab?.favIconUrl) ? tab.favIconUrl : undefined }
  const id = crypto.randomUUID()
  void (async () => {
    const key = `pointer:${tab?.id}:${info.frameId ?? 0}`
    const stored = await chrome.storage.session.get(key)
    const pointer = stored[key] as { x: number; y: number; left: number; top: number; width: number; height: number; time: number } | undefined
    const width = 360, height = 660
    const position = pointer && Date.now() - pointer.time < 120_000 ? {
      left: Math.round(Math.max(pointer.left, Math.min(pointer.x, pointer.left + pointer.width - width))),
      top: Math.round(Math.max(pointer.top, Math.min(pointer.y, pointer.top + pointer.height - height))),
    } : tab?.windowId !== undefined ? await chrome.windows.get(tab.windowId).then(window => ({
      left: (window.left ?? 0) + Math.max(0, Math.round(((window.width ?? width) - width) / 2)),
      top: (window.top ?? 0) + Math.max(0, Math.round(((window.height ?? height) - height) / 2)),
    })) : {}
    await chrome.storage.session.set({ [`page:${id}`]: page })
    await chrome.windows.create({ url: chrome.runtime.getURL(`index.html?capture=${id}`), type: 'popup', width, height, ...position })
  })().catch(console.error)
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
  if (sender.id === chrome.runtime.id && sender.tab?.id !== undefined && message?.type === 'context-position') {
    const values = ['x', 'y', 'left', 'top', 'width', 'height', 'time'] as const
    if (values.every(key => typeof message[key] === 'number' && Number.isFinite(message[key])) && message.width > 0 && message.height > 0) {
      void chrome.storage.session.set({ [`pointer:${sender.tab.id}:${sender.frameId ?? 0}`]: Object.fromEntries(values.map(key => [key, message[key]])) })
    }
    return
  }
  if (sender.id !== chrome.runtime.id || message?.type !== 'login') return
  if (loggingIn) { reply({ error: '授权正在进行，请完成登录窗口中的操作' }); return }
  loggingIn = true
  login().then(() => reply({ ok: true })).catch(e => reply({ error: e instanceof Error ? e.message : '授权未完成，请重试' })).finally(() => { loggingIn = false })
  return true
})

