import { expect, it } from 'vitest'
import { actOnApp, createApp, settleApp } from '../registry'
import { createFish, inPond, stepFish } from './simulation'
import { layoutItems } from '@/lib/gridLayout'
import { parseStateJSON } from '@/lib/store'

it('persists weather and feeding, rejects feeding outside water and resets only daily counts', () => {
  const now = new Date(2026,10,19,12).getTime()
  const pond = createApp('fishpond', now)
  expect(actOnApp(pond, { type:'fishpond-feed', x:0,y:0 }, now)).toBe(pond)
  const fed = actOnApp(pond, { type:'fishpond-feed',x:500,y:355 }, now)
  const night = actOnApp(fed, { type:'fishpond-weather',weather:'night' }, now)
  const state = {version:1,partitions:[{id:'p',name:'池塘',items:[{id:'pond',kind:'app',app:night}]}],activePartitionId:'p'}
  expect(parseStateJSON(JSON.stringify(state))?.partitions[0].items[0]).toMatchObject({app:{type:'fishpond',weather:'night',fishFed:1,lastFedAt:now}})
  expect(settleApp(night,now+86400000)).toMatchObject({fishFed:0,weather:'night',lastFedAt:now})
})

it('keeps full-page ponds out of ordinary bookmark placement', () => {
  const result = layoutItems([{id:'pond',kind:'app',app:createApp('fishpond')},{id:'b',kind:'bookmark',bookmark:{id:'b',name:'测试',url:'https://example.com'}}],6,8)
  expect(result.placements.has('pond')).toBe(false)
  expect(result.placements.get('b')).toEqual({x:0,y:0})
})

it('fish approach food, consume it and stay inside the pond during long turns', () => {
  const fish=createFish()
  const food=[{id:1,x:500,y:355,bites:3,expiresAt:12000}]
  const initial=Math.min(...fish.map(f=>Math.hypot(f.x-500,f.y-355)))
  let best=initial
  for(let n=0;n<600;n++) {
    stepFish(fish,food,1/60,n*1000/60)
    best=Math.min(best,...fish.map(f=>Math.hypot(f.x-500,f.y-355)))
    for(const f of fish) expect(inPond(f)).toBe(true)
  }
  expect(best).toBeLessThan(19)
  expect(food[0].bites).toBe(0)
})
