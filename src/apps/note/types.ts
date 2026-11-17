export interface NoteArchive {
  id: string
  text: string
  color: 'cream' | 'pink' | 'green'
  createdAt: number
  archivedAt: number
}
export interface NoteApp {
  type: 'note'
  text: string
  color: NoteArchive['color']
  /** 可选字段兼容已有便签。旧便签从首次编辑或归档时记录日期。 */
  createdAt?: number
  history?: NoteArchive[]
}

export type NoteAction = { type: 'note-text'; text: string } | { type: 'note-color'; color: NoteArchive['color'] } | { type: 'note-archive'; id: string } | { type: 'note-restore'; id: string; draftId: string }
