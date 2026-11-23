export const FONT_OPTIONS = [
  {
    id: 'system',
    name: '系统默认',
    description: '跟随设备的默认界面字体',
    family: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  },
  {
    id: 'sans',
    name: '无衬线',
    description: '简洁清晰，优先使用微软雅黑、苹方等字体',
    family: 'Arial, "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif',
  },
  {
    id: 'serif',
    name: '衬线',
    description: '书卷风格，优先使用宋体、宋体 SC 等字体',
    family: 'Georgia, "Times New Roman", "Songti SC", SimSun, "Noto Serif CJK SC", serif',
  },
  {
    id: 'yahei',
    name: '微软雅黑',
    description: '圆润清晰，常见于 Windows 设备',
    family: '"Microsoft YaHei", "Microsoft YaHei UI", "PingFang SC", "Noto Sans CJK SC", sans-serif',
  },
  {
    id: 'pingfang',
    name: '苹方',
    description: '轻盈现代，常见于 Apple 设备',
    family: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
  },
  {
    id: 'simsun',
    name: '宋体',
    description: '经典印刷风格，笔画横细竖粗',
    family: 'SimSun, "Songti SC", "Noto Serif CJK SC", serif',
  },
  {
    id: 'kaiti',
    name: '楷体',
    description: '手写书法风格，适合雅致的桌面',
    family: 'KaiTi, "Kaiti SC", STKaiti, "Songti SC", SimSun, serif',
  },
  {
    id: 'fangsong',
    name: '仿宋',
    description: '笔画纤细匀称，带有传统书刊气息',
    family: 'FangSong, STFangsong, "Songti SC", SimSun, serif',
  },
  {
    id: 'mono',
    name: '等宽',
    description: '英文与数字等宽，中文使用设备字体回退',
    family: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", "Microsoft YaHei", monospace',
  },
  {
    id: 'source-han-sans',
    name: '思源黑体',
    description: '干净匀称的现代黑体；若本机未安装则使用无衬线替代',
    family: '"Source Han Sans SC", "Source Han Sans CN", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
  },
  {
    id: 'source-han-serif',
    name: '思源宋体',
    description: '端正典雅，适合阅读与长文本',
    family: '"Source Han Serif SC", "Source Han Serif CN", "Noto Serif CJK SC", "Songti SC", SimSun, serif',
  },
  {
    id: 'lxgw-wenkai',
    name: '霞鶩文楷',
    description: '溫潤的手寫楷體，帶有筆記與閱讀的氣息',
    family: '"LXGW WenKai", "LXGW WenKai Screen", "Kaiti SC", KaiTi, "Songti SC", serif',
  },
  {
    id: 'zhuque-fangsong',
    name: '朱雀仿宋',
    description: '秀麗纖細、富有古典感的仿宋字體',
    family: '"Zhuque Fangsong", "FangSong", STFangsong, "Songti SC", serif',
  },
  {
    id: 'lxgw-neoxihei',
    name: '霞鶩新晰黑',
    description: '活潑明快的圓角黑體風格',
    family: '"LXGW Neo XiHei", "LXGW Neo XiHei Lite", "Microsoft YaHei", "PingFang SC", sans-serif',
  },
  {
    id: 'huiwen-mincho',
    name: '匯文明朝體',
    description: '明朝風格宋體，適合打造復古閱讀感',
    family: '"Huiwen Mincho", "Huiwen-mincho", "Songti SC", SimSun, serif',
  },
  {
    id: 'zcoool-kuaile',
    name: '站酷快樂體',
    description: '圓潤俏皮，為桌面添一點輕鬆感',
    family: '"ZCOOL KuaiLe", "ZCOOL KuaiLe SC", "Microsoft YaHei", "PingFang SC", sans-serif',
  },
  {
    id: 'consolas',
    name: 'Consolas',
    description: '清晰易讀的經典編程等寬字體',
    family: 'Consolas, "Cascadia Code", "SFMono-Regular", Menlo, monospace',
  },
  {
    id: 'courier-new',
    name: 'Courier New',
    description: '復古打字機風格的等寬字體',
    family: '"Courier New", Courier, "Microsoft YaHei", monospace',
  },
] as const

export type FontPreference = (typeof FONT_OPTIONS)[number]['id']

export const FONT_SCALE_MIN = 90
export const FONT_SCALE_MAX = 130
export const FONT_SCALE_STEP = 5

export function normalizeFontScale(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 100
  return Math.round(Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, value)) / FONT_SCALE_STEP) * FONT_SCALE_STEP
}

export function normalizeFont(value: unknown): FontPreference {
  return FONT_OPTIONS.find((font) => font.id === value)?.id ?? 'system'
}
