import './styles.css'
import { lazy, Suspense } from 'react'
import type { ComponentType } from 'react'
import type { AppCardProps, AppType } from './types'

const APP_CARDS: Record<AppType, React.LazyExoticComponent<ComponentType<AppCardProps>>> = {
  answers: lazy(() => import('./answers/Card').then((module) => ({ default: module.Card }))),
  salary: lazy(() => import('./salary/Card').then((module) => ({ default: module.Card }))),
  note: lazy(() => import('./note/Card').then((module) => ({ default: module.Card }))),
  todo: lazy(() => import('./todo/Card').then((module) => ({ default: module.Card }))),
  water: lazy(() => import('./water/Card').then((module) => ({ default: module.Card }))),
  woodfish: lazy(() => import('./woodfish/Card').then((module) => ({ default: module.Card }))),
  pomodoro: lazy(() => import('./pomodoro/Card').then((module) => ({ default: module.Card }))),
}

export function AppTile(props: AppCardProps) {
 const Card = APP_CARDS[props.app.type]
 return <Suspense fallback={<div aria-hidden="true" className="shrink-0 rounded-3xl border border-white/30 bg-white/35 shadow-lg shadow-black/10 backdrop-blur-xl" style={{ width: props.width, height: props.height }} />}><Card {...props} /></Suspense>
}
