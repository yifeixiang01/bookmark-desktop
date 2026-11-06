// 数据模型 —— 华为手机桌面式：分区 > 桌面项目（独立书签 | 文件夹）
export interface Bookmark {
  id: string
  name: string
  url: string
  /** 自定义图标 URL，为空则自动按域名抓取 favicon */
  icon?: string
  /** 网站简介（自动抓取或手填），悬停图标时展示 */
  description?: string
}

export interface Group {
  id: string
  name: string
  bookmarks: Bookmark[]
}

/** 网格坐标（逻辑格，单位=一个图标槽位） */
export interface GridPos {
  x: number
  y: number
}

interface DesktopItemBase {
  id: string
  /** 自由摆放位置；为空时由布局引擎按数组顺序自动填充第一个空位 */
  pos?: GridPos
}

/** 桌面上的一个格子：要么是独立书签图标，要么是文件夹 */
export type DesktopItem =
  | (DesktopItemBase & { kind: 'bookmark'; bookmark: Bookmark })
  | (DesktopItemBase & { kind: 'group'; group: Group })

export interface Partition {
  id: string
  name: string
  items: DesktopItem[]
  /** Dock 栏固定的书签 id 列表 */
  dock: string[]
}

export type IconSize = 's' | 'm' | 'l'

/** 各档图标边长（px），桌面独立图标基准；文件夹/Dock 按比例缩放 */
export const ICON_PX: Record<IconSize, number> = { s: 44, m: 56, l: 68 }

export interface AppState {
  version: 1
  partitions: Partition[]
  activePartitionId: string
  /** 壁纸预设 id，或 "custom:<url>" */
  wallpaper: string
  searchEngine: string
  /** 锁定布局：开启后禁止拖拽 */
  locked: boolean
  iconSize: IconSize
}
