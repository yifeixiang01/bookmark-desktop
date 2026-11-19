import type { DesktopApp } from '@/apps/types'
export type { DesktopApp, AppType } from '@/apps/types'
export type { NoteApp, NoteArchive } from '@/apps/note/types'
export type { TodoApp } from '@/apps/todo/types'
export type { WaterApp } from '@/apps/water/types'
export type { WoodfishApp } from '@/apps/woodfish/types'
export type { PomodoroApp } from '@/apps/pomodoro/types'

// 数据模型 —— 华为手机桌面式：空间 > 桌面项目（独立书签 | 文件夹）
export interface Bookmark {
  /** ISO timestamp when collected; absent on older bookmarks. */
  createdAt?: string
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
  | (DesktopItemBase & { kind: 'app'; app: DesktopApp })

export interface Partition {
  id: string
  name: string
  items: DesktopItem[]
  /** 移动端顶层项目顺序；与 PC 端自由网格坐标互不影响。 */
  mobileOrder?: string[]
  /** 该空间共享的便签归档；删除便签卡片不会删除这里的历史。 */
  noteHistory?: import('@/apps/note/types').NoteArchive[]
}

export type IconSize = 's' | 'm' | 'l'

/** 各档图标边长（px），桌面独立图标基准。 */
export const ICON_PX: Record<IconSize, number> = { s: 44, m: 56, l: 68 }

export interface AppState {
  version: 1
  /** 全局字体预设；旧数据缺省时使用系统默认。 */
  font?: import('@/lib/fonts').FontPreference
  /** 文字缩放百分比，默认 100。 */
  fontScale?: number
  partitions: Partition[]
  activePartitionId: string
  /** 壁纸预设 id，或 "custom:<url>" */
  wallpaper: string
  searchEngine: string
  /** 锁定布局：开启后禁止拖拽 */
  locked: boolean
  iconSize: IconSize
}
