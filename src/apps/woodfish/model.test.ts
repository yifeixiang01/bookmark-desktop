import { expect, it } from 'vitest'
import { actOnApp, createApp } from '@/apps'

  it('counts repeated woodfish taps exactly and retains sound preferences', () => {
    let fish = createApp('woodfish')
    for (let n = 0; n < 20; n++) fish = actOnApp(fish, { type: 'woodfish-hit' }, 0)
    expect(actOnApp(fish, { type: 'woodfish-sound' }, 0)).toMatchObject({ count: 20, sound: false })
  })
