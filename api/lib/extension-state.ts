import { randomUUID } from 'node:crypto';
import type { AppState, Bookmark } from '../../src/types/bookmark';

export function defaultState(): AppState {
  const id = randomUUID();
  return { version: 1, partitions: [{ id, name: '我的空间', items: [] }], activePartitionId: id, wallpaper: 'dusk-ridge', searchEngine: 'baidu', locked: false, iconSize: 'm' };
}
export function canonicalUrl(value: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('仅支持 HTTP / HTTPS 网站');
  return url.href;
}
export function addToSpaces(state: AppState, input: { spaceIds: string[]; title: string; url: string; icon?: string; description?: string }) {
  const ids = [...new Set(input.spaceIds)];
  if (!ids.length || ids.some(id => !state.partitions.some(p => p.id === id))) throw new Error('空间不存在，请刷新后重新选择');
  const url = canonicalUrl(input.url);
  const bookmark: Bookmark = { id: randomUUID(), createdAt: new Date().toISOString(), name: input.title, url, icon: input.icon, description: input.description };
  const added: string[] = [], skipped: string[] = [];
  for (const p of state.partitions) {
    if (!ids.includes(p.id)) continue;
    const bookmarks = p.items.flatMap(it => it.kind === 'bookmark' ? [it.bookmark] : it.kind === 'group' ? it.group.bookmarks : []);
    const exists = bookmarks.some(b => { try { return canonicalUrl(b.url) === url; } catch { return false; } });
    if (exists) skipped.push(p.id);
    else { p.items.push({ id: randomUUID(), kind: 'bookmark', bookmark: { ...bookmark } }); added.push(p.id); }
  }
  return { added, skipped };
}
