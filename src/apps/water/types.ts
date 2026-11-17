export interface WaterApp {
  type: 'water'
  interval: number
  nextAt: number | null
  enabled: boolean
  due: boolean
  day: string
  cups: number
}

export type WaterAction = { type: 'water-drink' | 'water-toggle' } | { type: 'water-interval'; minutes: number }
