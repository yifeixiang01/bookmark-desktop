import type { DesktopApp, AppAction } from '../types'
import type { WoodfishApp, WoodfishAction } from './types'
import { createWoodfish, actOnWoodfish } from './model'

function accepts(action: AppAction): action is WoodfishAction { return typeof action !== 'string' && action.type.startsWith('woodfish-') }

export const woodfishDefinition = {
 type: 'woodfish' as const, name: '敲木鱼', description: '敲一下木鱼，给心情留一点平静。', available: true as const,
 create: (): WoodfishApp => createWoodfish(),
 preview: (): WoodfishApp => { return { ...createWoodfish(), count: 108 } },
 settle: (app: DesktopApp): DesktopApp => app,
 act: (app: DesktopApp, action: AppAction): DesktopApp => app.type === 'woodfish' && accepts(action) ? actOnWoodfish(app, action) : app,
}

