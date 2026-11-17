export interface WoodfishApp { type: 'woodfish'; count: number; sound: boolean }

export type WoodfishAction = { type: 'woodfish-hit' | 'woodfish-sound' }
