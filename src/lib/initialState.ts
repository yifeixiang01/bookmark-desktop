import type { AppState, Bookmark, DesktopItem, Group, Partition } from '../types/bookmark'
import { createNote } from '../apps/note/model'
import { createTodo } from '../apps/todo/model'
import { createPomodoro } from '../apps/pomodoro/model'

function uid(): string { return crypto.randomUUID() }
function groupItem(group: Group): DesktopItem { return { id: uid(), kind: 'group', group } }
function bookmarkItem(bookmark: Bookmark): DesktopItem { return { id: uid(), kind: 'bookmark', bookmark } }

function bm(name: string, url: string): Bookmark {
  return { id: uid(), name, url }
}

/** 每次创建独立的示例桌面，仅供无云端数据的新账号和首次本地加载使用。 */
export function createInitialState(): AppState {
  const baidu = bm('百度', 'https://www.baidu.com')
  const zhihu = bm('知乎', 'https://www.zhihu.com')
  const bilibili = bm('B站', 'https://www.bilibili.com')
  const dev: Group = {
    id: uid(),
    name: '学习与探索',
    bookmarks: [
      bm('GitHub', 'https://github.com'),
      bm('掘金', 'https://juejin.cn'),
      bm('MDN', 'https://developer.mozilla.org'),
      bm('StackOverflow', 'https://stackoverflow.com'),
    ],
  }
  const shopping: Group = {
    id: uid(),
    name: '购物',
    bookmarks: [bm('淘宝', 'https://www.taobao.com'), bm('京东', 'https://www.jd.com')],
  }
  const home: Partition = {
    id: uid(),
    name: '主页',
    items: [
      // Seven-column composition: tools on the left, collections on the lower right.
      // The layout engine repacks cards that would cross a page on smaller screens.
      { ...bookmarkItem(baidu), pos: { x: 3, y: 5 } },
      { ...bookmarkItem(zhihu), pos: { x: 4, y: 5 } },
      { ...bookmarkItem(bilibili), pos: { x: 5, y: 5 } },
      { ...groupItem(dev), pos: { x: 3, y: 3 } },
      { ...groupItem(shopping), pos: { x: 5, y: 3 } },
      {
        id: uid(),
        kind: 'app',
        pos: { x: 0, y: 0 },
        app: {
          ...createNote(),
          text: '欢迎来到你的书签桌面\n\n• 点击图标打开网站，点击文件夹名称展开收藏。\n• 拖动图标整理位置，叠放两个书签即可创建文件夹。\n• 右键桌面添加书签，右键图标可修改或删除。\n• 在「设置」中更换壁纸、创建空间，或添加更多应用。\n\n这是一张示例便签，可以直接修改，也可以移除。',
          createdAt: Date.now(),
        },
      },
      {
        id: uid(),
        kind: 'app',
        pos: { x: 3, y: 0 },
        app: {
          ...createTodo(),
          tasks: [
            { id: uid(), text: '打开一个示例书签', done: false },
            { id: uid(), text: '右键桌面，添加常用网站', done: false },
            { id: uid(), text: '在设置里挑选喜欢的壁纸', done: false },
          ],
        },
      },
      { id: uid(), kind: 'app', pos: { x: 0, y: 3 }, app: createPomodoro() },
    ],
  }
  return {
    version: 1,
    font: 'system',
    fontScale: 100,
    partitions: [home],
    activePartitionId: home.id,
    wallpaper: 'dusk-ridge',
    searchEngine: 'baidu',
    locked: false,
    iconSize: 'm',
  }
}
