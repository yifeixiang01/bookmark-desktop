import type { AppAction, DesktopApp } from '../types'
import { actOnSalary, createSalary } from './model'
import type { SalaryApp } from './types'

export const salaryDefinition = {
  type: 'salary' as const,
  name: '上班鼓励器',
  description: '看见每一秒的努力，换算成属于自己的小小底气。',
  available: true as const,
  create: (): SalaryApp => createSalary(),
  preview: (): SalaryApp => ({ ...createSalary(), monthlySalary: 15000 }),
  settle: (app: DesktopApp): DesktopApp => app,
  act: (app: DesktopApp, action: AppAction): DesktopApp => app.type === 'salary' && typeof action !== 'string' && action.type === 'salary-configure' ? actOnSalary(app, action) : app,
}
