import type { AppCardProps } from '../types'
import { Water } from './Water'
import { CardFrame } from '../CardFrame'
import { waterDefinition } from './definition'

export function Card(props: AppCardProps) {
 const { app } = props
 if (app.type !== 'water') return null
 return <CardFrame {...props} name={waterDefinition.name} background={'bg-[#f0f7fa]/95'}><Water app={app} disabled={!!props.editMode || !!props.preview} onAction={props.onAction ?? (() => {})} /></CardFrame>
}
