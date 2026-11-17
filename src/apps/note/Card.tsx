import type { AppCardProps } from '../types'
import { Note } from './Note'
import { CardFrame } from '../CardFrame'
import { noteDefinition } from './definition'

export function Card(props: AppCardProps) {
 const { app } = props
 if (app.type !== 'note') return null
 return <CardFrame {...props} name={noteDefinition.name} emoji={noteDefinition.emoji} background={({ cream: 'bg-[#fff7cf]/95', pink: 'bg-[#ffe4ec]/95', green: 'bg-[#e0f2df]/95' })[app.color]}><Note app={app} disabled={!!props.editMode || !!props.preview} onAction={props.onAction ?? (() => {})} /></CardFrame>
}
