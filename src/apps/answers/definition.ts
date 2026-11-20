import type { DesktopApp, AppAction } from '../types'
import type { AnswersApp } from './types'
import { ANSWERS } from './answers'

export const answersDefinition = {
  type: 'answers' as const, name: '答案之书', description: '默念心中的问题，翻开一页，遇见一个答案。', available: true as const,
  create: (): AnswersApp => ({ type: 'answers', answer: null, draws: 0 }),
  preview: (): AnswersApp => ({ type: 'answers', answer: null, draws: 0 }),
  settle: (app: DesktopApp): DesktopApp => app,
  act: (app: DesktopApp, action: AppAction): DesktopApp => app.type === 'answers' && typeof action !== 'string' && action.type === 'answers-draw' && Number.isInteger(action.index) && action.index >= 0 && action.index < ANSWERS.length
    ? { ...app, answer: action.index, draws: app.draws + 1, recent: [...(app.recent ?? []), action.index].slice(-32) } : app,
}
