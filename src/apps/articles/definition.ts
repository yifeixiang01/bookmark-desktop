import type { DesktopApp } from '../types'

export const articlesDefinition = {
  type: 'articles' as const,
  name: '文章收藏',
  description: '收藏文章、添加标签和备注，集中查找好内容。所有入口共享账号文章库。',
  available: true as const,
  create: (): DesktopApp => ({ type: 'articles' }),
  preview: (): DesktopApp => ({ type: 'articles' }),
  settle: (app: DesktopApp): DesktopApp => app,
  act: (app: DesktopApp): DesktopApp => app,
}
