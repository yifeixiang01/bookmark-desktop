import type { AppCardProps } from '../types'
import { Woodfish } from './Woodfish'
import { CardFrame } from '../CardFrame'
import { woodfishDefinition } from './definition'

export function Card(props: AppCardProps) {
 const { app } = props
 if (app.type !== 'woodfish') return null
 return <CardFrame {...props} name={woodfishDefinition.name} emoji={woodfishDefinition.emoji} background={'bg-[#fff5e5]/95'}><Woodfish app={app} disabled={!!props.editMode || !!props.preview} onAction={props.onAction ?? (() => {})} /></CardFrame>
}
