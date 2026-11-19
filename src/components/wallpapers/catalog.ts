interface WallpaperDef {
  id: string
  name: string
  image: string
  fallback: string
}

export const WALLPAPERS: WallpaperDef[] = [
  {
    id: 'dusk-ridge',
    name: '山野暮色',
    image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2400&q=85',
    fallback: '#344b54',
  },
  {
    id: 'sea-mist',
    name: '海岸晨光',
    image: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=2400&q=85',
    fallback: '#8aa5b0',
  },
  {
    id: 'pine-fog',
    name: '松林雾起',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=2400&q=85',
    fallback: '#274436',
  },
  {
    id: 'desert-glow',
    name: '沙海落日',
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=2400&q=85',
    fallback: '#a4694b',
  },
  {
    id: 'night-lake',
    name: '静夜湖畔',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2400&q=85',
    fallback: '#182540',
  },
  // CC0 photographs from Wikimedia Commons, bundled locally for reliable loading.
  {
    id: 'lake-reflection',
    name: '湖光倒影',
    image: '/wallpapers/lake-reflection.jpg',
    fallback: '#425c68',
  },
  {
    id: 'yosemite-sunset',
    name: '山谷夕照',
    image: '/wallpapers/yosemite-sunset.jpg',
    fallback: '#685f58',
  },
  {
    id: 'terraced-fields',
    name: '层叠梯田',
    image: '/wallpapers/terraced-fields.jpg',
    fallback: '#536b38',
  },
  {
    id: 'ocean-waves',
    name: '碧海浪纹',
    image: '/wallpapers/ocean-waves.jpg',
    fallback: '#286b73',
  },
  {
    id: 'lofoten-mountains',
    name: '挪威群山',
    image: '/wallpapers/lofoten-mountains.jpg',
    fallback: '#3b535b',
  },
  {
    id: 'mountain-balloon',
    name: '山间热气球',
    image: '/wallpapers/mountain-balloon.jpg',
    fallback: '#59687a',
  },
]

export const DYNAMIC_WALLPAPERS = [
  {
    id: 'kite-meadow',
    name: '风筝草原',
    image: '/wallpapers/kite-meadow-preview.webp',
    tag: '布局互动',
  },
  {
    id: 'koi-pond',
    name: '荷风锦游',
    image: '/wallpapers/koi-pond-preview.webp',
    tag: '锦鲤 · 水光互动',
  },
  {
    id: 'bookmark-islands',
    name: '书签群岛',
    image: '/wallpapers/bookmark-islands-preview.webp',
    tag: '布局互动',
  },
]

