import { useEffect, useRef, useState } from 'react'

interface WallpaperDef {
  id: string
  name: string
  sky: string // 天空渐变
  mountains?: [string, string] // 远/近两层山体颜色
  sun?: string // 太阳/月亮颜色
  sea?: string // 底部水面颜色
}

export const WALLPAPERS: WallpaperDef[] = [
  {
    id: 'dusk-ridge',
    name: '山野暮色',
    sky: 'linear-gradient(180deg,#1f2b4d 0%,#4a4a72 34%,#a06a7c 58%,#e88f6b 76%,#f4c29a 100%)',
    mountains: ['#3a3d5c', '#232740'],
  },
  {
    id: 'sea-mist',
    name: '海面晨雾',
    sky: 'linear-gradient(180deg,#a8c8d4 0%,#cfdfe4 45%,#eef3ef 70%,#e3ecec 100%)',
    mountains: ['#8fabb5', '#5d7e89'],
    sun: '#fdf6e3',
  },
  {
    id: 'pine-fog',
    name: '松林雾起',
    sky: 'linear-gradient(180deg,#15251f 0%,#274436 40%,#4d6f5c 72%,#8fae97 100%)',
    mountains: ['#22392f', '#12241c'],
  },
  {
    id: 'desert-glow',
    name: '沙海落日',
    sky: 'linear-gradient(180deg,#2c2140 0%,#6b3f63 38%,#c96a54 66%,#eda45c 100%)',
    mountains: ['#4b2f4a', '#2e1e33'],
    sun: '#ffd9a0',
  },
  {
    id: 'night-lake',
    name: '静夜湖畔',
    sky: 'linear-gradient(180deg,#0b1026 0%,#1b2a4a 45%,#31517a 78%,#4a7196 100%)',
    mountains: ['#1c2942', '#0e1626'],
    sea: 'linear-gradient(180deg,rgba(20,32,56,0) 0%,rgba(10,16,32,0.85) 100%)',
  },
]

function Ridges({ colors }: { colors: [string, string] }) {
  return (
    <>
      <svg
        className="absolute bottom-0 left-0 w-full"
        style={{ height: '46%' }}
        viewBox="0 0 1440 460"
        preserveAspectRatio="none"
      >
        <path
          fill={colors[0]}
          opacity="0.85"
          d="M0,260 L140,180 L300,250 L470,140 L640,230 L820,120 L1000,220 L1180,150 L1330,230 L1440,190 L1440,460 L0,460 Z"
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-full"
        style={{ height: '34%' }}
        viewBox="0 0 1440 340"
        preserveAspectRatio="none"
      >
        <path
          fill={colors[1]}
          d="M0,190 L180,110 L360,190 L560,80 L760,180 L960,100 L1180,190 L1350,130 L1440,170 L1440,340 L0,340 Z"
        />
      </svg>
    </>
  )
}

function Scene({ id }: { id: string }) {
  if (id.startsWith('custom:')) {
    const url = id.slice(7)
    return (
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${url})`, backgroundColor: '#1f2b4d' }}
      />
    )
  }
  const def = WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0]
  return (
    <div className="absolute inset-0" style={{ background: def.sky }}>
      {def.sun && (
        <div
          className="absolute rounded-full"
          style={{
            width: 110,
            height: 110,
            right: '18%',
            top: '16%',
            background: `radial-gradient(circle, ${def.sun} 0%, ${def.sun}55 40%, transparent 70%)`,
            boxShadow: `0 0 90px 40px ${def.sun}44`,
          }}
        />
      )}
      {def.mountains && <Ridges colors={def.mountains} />}
      {def.sea && (
        <div className="absolute bottom-0 left-0 w-full" style={{ height: '22%', background: def.sea }} />
      )}
    </div>
  )
}

/** 新壁纸层：挂载后从透明淡入 */
function FadeScene({ id, instant }: { id: string; instant: boolean }) {
  const [shown, setShown] = useState(instant)
  useEffect(() => {
    if (instant) return
    const raf = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(raf)
  }, [instant])
  return (
    <div
      className="absolute inset-0"
      style={{ opacity: shown ? 1 : 0, transition: 'opacity 550ms ease' }}
    >
      <Scene id={id} />
    </div>
  )
}

/** 壁纸：切换时新旧场景交叉淡化 */
export function Wallpaper({ id }: { id: string }) {
  const [layers, setLayers] = useState<string[]>([id])
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1] === id ? prev : [prev[prev.length - 1], id]))
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setLayers([id]), 650)
    return () => clearTimeout(timer.current)
  }, [id])

  return (
    <div className="fixed inset-0 -z-10">
      {layers.map((layerId, i) => (
        <FadeScene key={layerId} id={layerId} instant={i < layers.length - 1 || layers.length === 1} />
      ))}
    </div>
  )
}
