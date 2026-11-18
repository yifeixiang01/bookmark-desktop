import { useEffect, useRef, useState } from 'react'

interface WallpaperDef {
  id: string
  name: string
  image: string
  fallback: string
}

export const WALLPAPERS: WallpaperDef[] = [
  {
    id: 'dusk-ridge',
    name: '山野暮色',
    image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2400&q=85',
    fallback: '#344b54',
  },
  {
    id: 'sea-mist',
    name: '海岸晨光',
    image: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=2400&q=85',
    fallback: '#8aa5b0',
  },
  {
    id: 'pine-fog',
    name: '松林雾起',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=2400&q=85',
    fallback: '#274436',
  },
  {
    id: 'desert-glow',
    name: '沙海落日',
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=2400&q=85',
    fallback: '#a4694b',
  },
  {
    id: 'night-lake',
    name: '静夜湖畔',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2400&q=85',
    fallback: '#182540',
  },
  // CC0 photographs discovered through Wikimedia Commons; filenames identify their source pages.
  {
    id: 'lake-reflection',
    name: '湖光倒影',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Lake_Unsplash.jpg/3840px-Lake_Unsplash.jpg',
    fallback: '#425c68',
  },
  {
    id: 'yosemite-sunset',
    name: '山谷夕照',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Sunset_Half_Dome_Falls_%28Unsplash%29.jpg/3840px-Sunset_Half_Dome_Falls_%28Unsplash%29.jpg',
    fallback: '#685f58',
  },
  {
    id: 'terraced-fields',
    name: '层叠梯田',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Terraces_in_Che_Cu_Nha_commune%2C_Mu_Cang_Chai_%28Unsplash%29.jpg/3840px-Terraces_in_Che_Cu_Nha_commune%2C_Mu_Cang_Chai_%28Unsplash%29.jpg',
    fallback: '#536b38',
  },
  {
    id: 'ocean-waves',
    name: '碧海浪纹',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Drone_view_of_ocean_waves_1_%28Unsplash%29.jpg/3840px-Drone_view_of_ocean_waves_1_%28Unsplash%29.jpg',
    fallback: '#286b73',
  },
  {
    id: 'lofoten-mountains',
    name: '挪威群山',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/86/Lofoten%2C_Norway_%28Unsplash%29.jpg/3840px-Lofoten%2C_Norway_%28Unsplash%29.jpg',
    fallback: '#3b535b',
  },
  {
    id: 'mountain-balloon',
    name: '山间热气球',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Hot_air_balloon_in_mountains_%28Unsplash%29.jpg/3840px-Hot_air_balloon_in_mountains_%28Unsplash%29.jpg',
    fallback: '#59687a',
  },
]

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
    <>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${def.image})`, backgroundColor: def.fallback }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,24,32,0.18),rgba(10,24,32,0.05)_48%,rgba(7,18,24,0.38))]" />
    </>
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
