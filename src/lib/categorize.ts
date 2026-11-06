// 按域名关键字给书签归类，用于文件夹智能命名
// 顺序敏感：前面的类别优先匹配（如音乐要先于资讯，避免 y.qq.com 被归为资讯）
const CATEGORIES: Array<[string, string[]]> = [
  ['音乐', ['music.163', 'y.qq.com', 'spotify', 'xiami', 'kugou', 'kuwo']],
  ['视频', ['bilibili', 'youtube', 'iqiyi', 'youku', 'douyin', 'tiktok', 'netflix', 'mgtv', 'kuaishou', 'huya', 'douyu']],
  ['AI', ['deepseek', 'kimi', 'openai', 'chatgpt', 'claude', 'doubao', 'tongyi', 'gemini', 'copilot', 'moonshot', 'qwen', 'huggingface']],
  ['开发', ['github', 'gitlab', 'stackoverflow', 'juejin', 'csdn', 'mozilla', 'codepen', 'gitee', 'npmjs', 'vercel', 'segmentfault', 'leetcode', 'cloudflare', 'linux.do']],
  ['设计', ['figma', 'canva', 'dribbble', 'behance', 'uisdc', 'zcool', 'mastergo']],
  ['购物', ['taobao', 'tmall', 'jd.com', 'pinduoduo', 'amazon', 'shein', 'vip.com', 'suning', 'goofish', 'xianyu', '1688']],
  ['社交', ['weibo', 'zhihu', 'xiaohongshu', 'x.com', 'twitter', 'facebook', 'instagram', 'douban', 'tieba', 'reddit', 'linkedin', 'v2ex']],
  ['办公', ['notion', 'feishu', 'larksuite', 'dingtalk', 'wps', 'docs.qq', 'yuque', 'shimo', 'zoom', 'slack', 'tower']],
  ['出行', ['12306', 'ctrip', 'amap', 'didi', 'map.baidu', 'fliggy', 'qunar', '携程']],
  ['邮箱', ['mail.', 'outlook', 'gmail']],
  ['搜索', ['baidu', 'google', 'bing', 'sogou', 'so.com']],
  ['资讯', ['toutiao', '36kr', 'sspai', 'ithome', 'sina.com', '163.com', 'qq.com', 'thepaper', 'huxiu']],
]

export function categoryOf(url: string): string | null {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return null
  }
  for (const [name, keywords] of CATEGORIES) {
    if (keywords.some((kw) => host.includes(kw))) return name
  }
  return null
}

/** 给一组书签挑一个多数派类别名作为文件夹名，无法判断时回退默认名 */
export function folderNameFor(bookmarks: Array<{ url: string }>): string {
  const counts = new Map<string, number>()
  for (const b of bookmarks) {
    const c = categoryOf(b.url)
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  if (!counts.size) return '新建文件夹'
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}
