import { useEffect, useRef, useState } from 'react'
import { CloudRain, Moon, Sun } from 'lucide-react'
import type { ControlProps } from '../types'
import type { FishPondAction, FishPondApp, FishPondWeather } from './types'
import { Scene } from './Scene'
import './styles.css'

const weathers: { value: FishPondWeather; label: string; icon: typeof Sun }[] = [
  { value: 'sunny', label: '晴天', icon: Sun }, { value: 'rainy', label: '雨天', icon: CloudRain }, { value: 'night', label: '夜晚', icon: Moon },
]

export function FishPond({ app, disabled, onAction }: ControlProps<FishPondApp, FishPondAction>) {
  const [feeding, setFeeding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  return <div className="pond-garden" data-weather={app.weather}>
    <div className="pond-toolbar">
      <div><p className="pond-eyebrow">A LITTLE SLOWER</p><h4>把片刻时光，留给鱼塘。</h4></div>
      <div className="pond-weather" role="group" aria-label="鱼塘天气">
        {weathers.map(({ value, label, icon: Icon }) => <button key={value} type="button" disabled={disabled} aria-label={label} aria-pressed={app.weather===value} onClick={() => onAction({ type: 'fishpond-weather', weather: value })}><Icon size={15} /><span>{label}</span></button>)}
      </div>
    </div>
    <div className="pond-view"><Scene weather={app.weather} disabled={disabled} active onFeed={({x,y}) => {
      onAction({ type: 'fishpond-feed', x, y })
      setFeeding(true); clearTimeout(timer.current); timer.current=setTimeout(()=>setFeeding(false),4500)
    }} /></div>
    <footer className="pond-footer"><span role="status">{feeding ? '鱼食落水了，小鱼正游过来…' : '轻点水面投喂，静看小鱼游来。'}</span><span>三尾锦鲤 <i /> 今日投喂 {app.fishFed} 次</span></footer>
  </div>
}
