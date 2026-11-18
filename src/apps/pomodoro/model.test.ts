import { expect, it } from 'vitest'
import { actOnPomodoro, createPomodoro, finishPomodoro, remainingSeconds } from '@/apps/pomodoro/model'
import { allBookmarks, parseStateJSON } from '@/lib/store'
import type { AppState } from '@/types/bookmark'

  it('pauses and resumes using the precise remaining time', () => {
    const started = actOnPomodoro(createPomodoro(), 'toggle', 10_000)
    expect(started.endsAt).toBe(1_510_000)
    expect(remainingSeconds(started, 40_001)).toBe(1470)
    const paused = actOnPomodoro(started, 'toggle', 40_001)
    expect(paused.endsAt).toBeNull()
    expect(remainingSeconds(paused, 500_000)).toBe(1470)
    const resumed = actOnPomodoro(paused, 'toggle', 500_000)
    expect(remainingSeconds(resumed, 501_000)).toBe(1469)
  })

  it('restores a running timer after serialization and counts an expired focus only once', () => {
    const app = JSON.parse(JSON.stringify(actOnPomodoro(createPomodoro(), 'toggle', 0)))
    expect(remainingSeconds(app, 600_000)).toBe(900)
    const finished = finishPomodoro(app, 2_000_000)
    expect(finished).toMatchObject({ completed: 1, finished: true, remaining: 0, endsAt: null })
    expect(finishPomodoro(finished, 3_000_000)).toBe(finished)
    expect(actOnPomodoro(app, 'toggle', 2_000_000)).toMatchObject({ completed: 1, finished: false, endsAt: 3_500_000 })
  })

  it('switches to a stopped break and does not count breaks as completed focus sessions', () => {
    const rest = actOnPomodoro(createPomodoro(), 'break', 0)
    expect(rest).toMatchObject({ mode: 'break', remaining: 300, endsAt: null })
    const finished = finishPomodoro(actOnPomodoro(rest, 'toggle', 0), 300_000)
    expect(finished.completed).toBe(0)
    expect(actOnPomodoro(finished, 'reset', 400_000)).toMatchObject({ remaining: 300, finished: false, endsAt: null })
  })

  it('never shows more than the saved remaining time when the display clock predates a resume', () => {
    const app = actOnPomodoro(createPomodoro(), 'toggle', 100_000)
    expect(remainingSeconds(app, 0)).toBe(1500)
  })

it('preserves app cards in backups and excludes them from bookmark queries', () => {
  const state: AppState = { version: 1, activePartitionId: 'p', wallpaper: 'dusk-ridge', searchEngine: 'baidu', locked: false, iconSize: 'm', partitions: [{ id: 'p', name: '主页', items: [
    { id: 'app', kind: 'app', pos: { x: 3, y: 0 }, app: createPomodoro() },
    { id: 'bm', kind: 'bookmark', bookmark: { id: 'b', name: 'Example', url: 'https://example.com' } },
  ] }] }
  const restored = parseStateJSON(JSON.stringify(state))!
  expect(restored.partitions[0].items[0]).toEqual(state.partitions[0].items[0])
  expect(allBookmarks(restored.partitions[0]).map((b) => b.id)).toEqual(['b'])
})
