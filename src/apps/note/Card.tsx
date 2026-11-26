import type { AppCardProps } from '../types'
import { Note } from './Note'
import { CardFrame } from '../CardFrame'
import { noteDefinition } from './definition'

export function Card(props: AppCardProps) {
 const { app } = props
 if (app.type !== 'note') return null
 return <CardFrame {...props} name={noteDefinition.name} background={`note-card note-card-${app.color} ${({ cream: 'bg-[#fbf4dc]/95', pink: 'bg-[#f8e7ea]/95', green: 'bg-[#eaf0e2]/95' })[app.color]}`}><Note app={app} history={props.noteHistory ?? app.history} disabled={!!props.editMode || !!props.preview} onAction={props.onAction ?? (() => {})} /></CardFrame>
}
