import { expect, it } from 'vitest'
import { encouragementAt } from './encouragement'

const at = (day: number, hour: number, minute = 0, second = 0) => new Date(2026, 10, day, hour, minute, second).getTime()

it('keeps messages stable within a half-hour and varies by local date and time', () => {
  const message = encouragementAt(at(20, 10, 1), 'working', .3, 20000)
  expect(encouragementAt(at(20, 10, 29, 59), 'working', .35, 19000)).toBe(message)
  expect(encouragementAt(at(20, 10, 30), 'working', .35, 19000)).not.toBe(message)
  expect(encouragementAt(at(21, 10, 1), 'working', .3, 20000)).not.toBe(message)
})

it('responds to lunch, approaching clock-off, rest days and late evenings', () => {
  const working = encouragementAt(at(20, 12), 'working', .4, 20000)
  expect(encouragementAt(at(20, 12), 'lunch', .4, 20000)).not.toBe(working)
  expect(encouragementAt(at(20, 17, 30), 'working', .94, 1800)).toMatch(/下班|终点|属于你的时间/)
  expect(encouragementAt(at(21, 12), 'rest', 0, 0)).toMatch(/休息|充电|空白/)
  expect(encouragementAt(at(20, 22), 'after', 1, 0)).toMatch(/夜深|今晚|入睡/)
})
