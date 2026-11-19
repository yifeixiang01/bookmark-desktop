import { lazy, Suspense, useEffect, useRef, useState } from 'react'

import { WALLPAPERS } from './wallpapers/catalog'

const ArchipelagoWallpaper = lazy(() => import('./wallpapers/ArchipelagoWallpaper').then(module => ({ default: module.ArchipelagoWallpaper })))
const KoiPondWallpaper = lazy(() => import('./wallpapers/KoiPondWallpaper').then(module => ({ default: module.KoiPondWallpaper })))
const MeadowWallpaper = lazy(() => import('./wallpapers/MeadowWallpaper').then(module => ({ default: module.MeadowWallpaper })))

function Scene({ id }: { id: string }) {
  if (id === 'kite-meadow') return <Suspense fallback={<div className="absolute inset-0 bg-[#abc273]" />}><MeadowWallpaper /></Suspense>
  if (id === 'koi-pond') return <Suspense fallback={<div className="absolute inset-0 bg-[#638c79]" />}><KoiPondWallpaper /></Suspense>
  if (id === 'bookmark-islands') return <Suspense fallback={<div className="absolute inset-0 bg-[#4cb5b7]" />}><ArchipelagoWallpaper /></Suspense>
  if (id.startsWith('custom:')) {
    const url = id.slice(7)
    return (
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${url})`, backgroundColor: '#1f2b4d' }}
      />
    )
  }
  const staticId = id === 'interactive-lake' ? 'lake-reflection' : id
  const def = WALLPAPERS.find((w) => w.id === staticId) ?? WALLPAPERS.find((w) => w.id === 'dusk-ridge')!
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
    const raf = requestAnimationFrame(() => {
      setLayers((prev) => (prev[prev.length - 1] === id ? prev : [prev[prev.length - 1], id]))
    })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setLayers([id]), 650)
    return () => { cancelAnimationFrame(raf); clearTimeout(timer.current) }
  }, [id])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {layers.map((layerId, i) => (
        <FadeScene key={layerId} id={layerId} instant={i < layers.length - 1 || layers.length === 1} />
      ))}
    </div>
  )
}
