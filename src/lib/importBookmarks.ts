import type { Group } from '@/types/bookmark'
import { uid } from './store'

/**
 * 解析 Chrome / Edge 导出的书签 HTML（NETSCAPE-Bookmark-file-1 格式）。
 * 规则：每个文件夹（H3）变成一个分组，嵌套文件夹的书签拍平进各自文件夹；
 * 不属于任何文件夹的散书签归入「导入的书签」分组。
 */
export function parseBookmarkHTML(html: string): Group[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const groups: Group[] = []
  const loose: Group = { id: uid(), name: '导入的书签', bookmarks: [] }

  const collectLinks = (root: Element, into: Group) => {
    // 只取当前 DL 的直接 DT 子节点里的 A；嵌套文件夹单独成组
    const dts = Array.from(root.children).filter((el) => el.tagName === 'DT')
    for (const dt of dts) {
      const link = dt.querySelector(':scope > a')
      if (link) {
        const url = link.getAttribute('href') ?? ''
        if (url && /^https?:\/\//.test(url)) {
          into.bookmarks.push({
            id: uid(),
            name: (link.textContent ?? '').trim() || url,
            url,
          })
        }
      }
    }
  }

  const walk = (dl: Element) => {
    const dts = Array.from(dl.children).filter((el) => el.tagName === 'DT')
    for (const dt of dts) {
      const h3 = dt.querySelector(':scope > h3')
      const subDl = dt.querySelector(':scope > dl')
      if (h3 && subDl) {
        const group: Group = {
          id: uid(),
          name: (h3.textContent ?? '').trim() || '未命名文件夹',
          bookmarks: [],
        }
        collectLinks(subDl, group)
        if (group.bookmarks.length) groups.push(group)
        walk(subDl) // 嵌套文件夹继续拆成独立分组
      }
    }
  }

  const roots = Array.from(doc.querySelectorAll('dl'))
  // 顶层 DL 处理散书签；逐层 walk 处理文件夹
  for (const dl of roots) {
    const isTop = !dl.parentElement?.closest('dl')
    if (isTop) {
      collectLinks(dl, loose)
      walk(dl)
    }
  }
  if (loose.bookmarks.length) groups.unshift(loose)
  return groups
}
