export type FishPondWeather = 'sunny' | 'rainy' | 'night'

export interface FishPondApp {
  type: 'fishpond'
  weather: FishPondWeather
  fishFed: number
  lastFedAt: number | null
  day: string
}

export type FishPondAction =
  | { type: 'fishpond-feed'; x: number; y: number }
  | { type: 'fishpond-weather'; weather: FishPondWeather }
