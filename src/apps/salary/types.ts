export interface SalaryApp {
  type: 'salary'
  monthlySalary: number | null
  start: string
  end: string
  lunchStart: string
  lunchEnd: string
  lunchEnabled: boolean
  workdays: number[]
}

export type SalaryAction = { type: 'salary-configure'; settings: Omit<SalaryApp, 'type'> }
