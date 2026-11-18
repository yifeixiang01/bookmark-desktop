import type { AppCardProps } from '../types'
import { Todo } from './Todo'
import { CardFrame } from '../CardFrame'
import { todoDefinition } from './definition'

export function Card(props: AppCardProps) {
 const { app } = props
 if (app.type !== 'todo') return null
 return <CardFrame {...props} name={todoDefinition.name} background={'bg-[#f5f8f3]/95'}><Todo app={app} disabled={!!props.editMode || !!props.preview} onAction={props.onAction ?? (() => {})} /></CardFrame>
}
