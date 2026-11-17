import type { AppCardProps } from '../types'
import { PomodoroTile } from './PomodoroTile'

export function Card(props: AppCardProps) {
 const { app } = props
 if (app.type !== 'pomodoro') return null
 return <PomodoroTile {...props} app={app} />
}
