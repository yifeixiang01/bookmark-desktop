import type { AppState, Bookmark, DesktopItem, Group, Partition } from '../types/bookmark'
import { createNote } from '../apps/note/model'
import { createTodo } from '../apps/todo/model'

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
    name: '学习成长',
    bookmarks: [
      bm('GitHub', 'https://github.com'),
      bm('中国大学MOOC', 'https://www.icourse163.org'),
      bm('维基百科', 'https://zh.wikipedia.org'),
      bm('少数派', 'https://sspai.com'),
    ],
  }
  const shopping: Group = {
    id: uid(),
    name: '生活日常',
    bookmarks: [bm('淘宝', 'https://www.taobao.com'), bm('京东', 'https://www.jd.com'), bm('小红书', 'https://www.xiaohongshu.com'), bm('豆瓣', 'https://www.douban.com')],
  }
  const work: Group = {
    id: uid(), name: '效率工具',
    bookmarks: [bm('飞书', 'https://www.feishu.cn'), bm('腾讯文档', 'https://docs.qq.com'), bm('DeepSeek', 'https://chat.deepseek.com'), bm('Canva 可画', 'https://www.canva.cn')],
  }
  const home: Partition = {
    id: uid(),
    name: '主页',
    items: [
      // Nine-column composition: three tools above three collections.
      // The final row is left empty; narrow screens use the normal paging engine.
      { ...bookmarkItem(baidu), pos: { x: 0, y: 3 } },
      { ...bookmarkItem(zhihu), pos: { x: 0, y: 4 } },
      { ...bookmarkItem(bilibili), pos: { x: 3, y: 3 } },
      { ...bookmarkItem(bm('网易云音乐', 'https://music.163.com')), pos: { x: 3, y: 4 } },
      { ...bookmarkItem(bm('QQ邮箱', 'https://mail.qq.com')), pos: { x: 6, y: 3 } },
      { ...bookmarkItem(bm('高德地图', 'https://www.amap.com')), pos: { x: 6, y: 4 } },
      { ...groupItem(dev), pos: { x: 1, y: 3 } },
      { ...groupItem(shopping), pos: { x: 4, y: 3 } },
      { ...groupItem(work), pos: { x: 7, y: 3 } },
      {
        id: uid(),
        kind: 'app',
        pos: { x: 0, y: 0 },
        app: {
          ...createNote(),
          text: '把常用，留在手边。\n\n右键空白处，添加你的书签。\n拖入文件夹，收好同类收藏。\n在设置里，换一张喜欢的壁纸。\n\n这张便签，留给你的下一份灵感。',
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
            { id: uid(), text: '收藏一个每天都会打开的网站', done: false },
            { id: uid(), text: '挑选一张喜欢的壁纸', done: false },
            { id: uid(), text: '带着一个问题，试试答案之书', done: false },
          ],
        },
      },
      { id: uid(), kind: 'app', pos: { x: 6, y: 0 }, app: { type: 'answers', answer: null, draws: 0 } },
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
