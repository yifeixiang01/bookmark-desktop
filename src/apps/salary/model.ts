import type { SalaryAction, SalaryApp } from './types'
import { encouragementAt } from './encouragement'

export const createSalary = (): SalaryApp => ({ type: 'salary', monthlySalary: null, start: '09:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00', lunchEnabled: true, workdays: [1, 2, 3, 4, 5] })
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
export const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))

export function validSettings(settings: Omit<SalaryApp, 'type'>): boolean {
  const { monthlySalary, start, end, lunchStart, lunchEnd, lunchEnabled, workdays } = settings
  if (monthlySalary === null || !Number.isFinite(monthlySalary) || monthlySalary <= 0 || monthlySalary > 1e9) return false
  if (![start, end, lunchStart, lunchEnd].every(time => timePattern.test(time))) return false
  if (minutes(start) >= minutes(end)) return false
  if (lunchEnabled && !(minutes(start) <= minutes(lunchStart) && minutes(lunchStart) < minutes(lunchEnd) && minutes(lunchEnd) <= minutes(end))) return false
  return workdays.length > 0 && workdays.every(day => Number.isInteger(day) && day >= 0 && day <= 6) && new Set(workdays).size === workdays.length
}

export function actOnSalary(app: SalaryApp, action: SalaryAction): SalaryApp {
  return validSettings(action.settings) ? { ...app, ...action.settings, type: 'salary', workdays: [...action.settings.workdays] } : app
}

export function salarySnapshot(app: SalaryApp, now: number) {
  const date = new Date(now)
  const today = date.getDate()
  const year = date.getFullYear(), month = date.getMonth()
  const start = minutes(app.start), end = minutes(app.end)
  const lunchStart = minutes(app.lunchStart), lunchEnd = minutes(app.lunchEnd)
  const dailyMinutes = end - start - (app.lunchEnabled ? lunchEnd - lunchStart : 0)
  let totalDays = 0, completedDays = 0, remainingDays = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let day = 1; day <= daysInMonth; day++) {
    if (!app.workdays.includes(new Date(year, month, day).getDay())) continue
    totalDays++
    if (day < today) completedDays++
    if (day > today) remainingDays++
  }
  const clock = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60 + date.getMilliseconds() / 60000
  const workday = app.workdays.includes(date.getDay())
  const lunchElapsed = app.lunchEnabled ? Math.max(0, Math.min(clock, lunchEnd) - lunchStart) : 0
  const workedMinutes = workday ? Math.max(0, Math.min(dailyMinutes, Math.min(clock, end) - start - lunchElapsed)) : 0
  const status: 'rest' | 'before' | 'after' | 'lunch' | 'working' = !workday ? 'rest' : clock < start ? 'before' : clock >= end ? 'after' : app.lunchEnabled && clock >= lunchStart && clock < lunchEnd ? 'lunch' : 'working'
  if (workday && clock < end) remainingDays++
  const daily = totalDays ? (app.monthlySalary ?? 0) / totalDays : 0
  const hourly = dailyMinutes > 0 ? daily / dailyMinutes * 60 : 0
  const earned = dailyMinutes > 0 ? Math.min(daily, daily * workedMinutes / dailyMinutes) : 0
  const remainingSeconds = workday ? Math.max(0, (end - clock) * 60) : 0
  const progress = dailyMinutes > 0 ? workedMinutes / dailyMinutes : 0
  const encouragement = encouragementAt(now, status, progress, remainingSeconds)
  return { totalDays, remainingDays, daily, hourly, perSecond: hourly / 3600, earned, monthEarned: Math.min(app.monthlySalary ?? 0, completedDays * daily + earned), workedSeconds: workedMinutes * 60, remainingSeconds, progress, status, encouragement }
}
