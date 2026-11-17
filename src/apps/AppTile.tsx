import type { AppCardProps } from './types'
import { APP_CARDS } from './registry'

export function AppTile(props: AppCardProps) {
 const Card = APP_CARDS[props.app.type]
 return <Card {...props} />
}
