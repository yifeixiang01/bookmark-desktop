export const SITE = 'https://bookmark.yifeixiang.com.cn'
export interface Page { url: string; title: string; icon?: string }
export interface Account { id: number; name: string | null; email: string | null }
export interface Space { id: string; name: string; saved: boolean }
export function isWebUrl(value?: string): value is string {
  try { return !!value && ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false }
}
