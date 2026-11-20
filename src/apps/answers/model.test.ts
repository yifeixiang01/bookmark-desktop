import { expect, it } from 'vitest'
import { createApp, actOnApp } from '../registry'
import { ANSWERS, nextAnswer } from './answers'
import { createInitialState, parseStateJSON } from '@/lib/store'

it('draws valid answers without repeating the previous answer', () => {
  for (let current = 0; current < ANSWERS.length; current++) {
    for (const random of [0, .25, .5, .99]) {
      const next = nextAnswer(current, random)
      expect(next).not.toBe(current)
      expect(ANSWERS[next]).toBeTruthy()
    }
  }
})
it('persists the result, counts draws and rejects invalid actions', () => {
  const app = actOnApp(createApp('answers'), { type: 'answers-draw', index: 4 }, 0)
  expect(app).toMatchObject({ answer: 4, draws: 1 })
  expect(actOnApp(app, { type: 'answers-draw', index: -1 }, 0)).toBe(app)
  const state = createInitialState()
  state.partitions[0].items.push({ id: 'answers-test', kind: 'app', app })
  expect(parseStateJSON(JSON.stringify(state))?.partitions[0].items.at(-1)).toMatchObject({ app })
})

it('avoids all recent answers and keeps bounded history', () => {
  let app = createApp('answers')
  for (let i = 0; i < 80; i++) {
    if (app.type !== 'answers') throw new Error('Unexpected app')
    const index = nextAnswer(app.answer, (i % 9) / 9, app.recent)
    expect(app.recent ?? []).not.toContain(index)
    app = actOnApp(app, { type: 'answers-draw', index }, i)
  }
  expect(app.type === 'answers' && app.recent?.length).toBe(32)
})
