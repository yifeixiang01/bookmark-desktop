import { expect, it } from 'vitest'
import { actOnApp, createApp } from '@/apps'

  it('ignores empty or duplicate tasks and preserves task completion through serialization', () => {
    const empty = createApp('todo')
    expect(actOnApp(empty, { type: 'todo-add', id: '1', text: '  ' }, 0)).toBe(empty)
    const added = actOnApp(empty, { type: 'todo-add', id: '1', text: '  Read  ' }, 0)
    expect(actOnApp(added, { type: 'todo-add', id: '1', text: 'duplicate' }, 0)).toBe(added)
    const checked = actOnApp(added, { type: 'todo-toggle', id: '1' }, 0)
    expect(JSON.parse(JSON.stringify(checked))).toMatchObject({ tasks: [{ id: '1', text: 'Read', done: true }] })
    expect(actOnApp(checked, { type: 'todo-remove', id: '1' }, 0)).toMatchObject({ tasks: [] })
  })
