type WorkStatus = 'rest' | 'before' | 'after' | 'lunch' | 'working'

const messages = {
  rest: ['今天不用赶路，安心休息也是很重要的事。', '愿你在自己的生活里慢慢充电，被日常温柔对待。', '给自己留一点空白，做些让心情变好的小事吧。'],
  before: ['新的一天，按自己的节奏来，不用急着证明什么。', '先喝口温水，安顿好自己，再慢慢开始今天。', '不用一开始就做到最好，今天也请温柔地对待自己。'],
  lunch: ['先好好吃饭，这一会儿的时间只属于你。', '放下手边的忙碌，吃饱、歇好，下午再慢慢来。', '闭眼歇一小会儿吧，你也需要被好好照顾。'],
  after: ['今天辛苦了，接下来的时间留给自己，慢慢放松吧。', '下班啦，愿回家的路上有让你心情变好的小事。', '今天的付出值得肯定，现在可以安心歇一歇了。'],
  night: ['夜深了，今天就到这里吧，愿你今晚睡得安稳。', '把没做完的事留给明天，今晚先好好照顾自己。', '忙碌的一天过去了，愿你带着轻松的心情入睡。'],
  early: ['你已经迈出第一步了，接下来也可以慢慢来。', '今天也在为生活认真努力，记得给自己一点肯定。', '一点点积累就很好，不必把自己绷得太紧。'],
  middle: ['你正在认真照顾自己的生活，这份坚持很珍贵。', '忙了一阵了，放松肩膀，给自己一个小小的喘息。', '眼前的一点点努力，也值得被温柔地看见。'],
  late: ['今天已经走了很远，记得也给自己一声肯定。', '如果有些累，就轻轻歇一下，你已经做得很好了。', '再忙也别忘了喝口水，你比手头的事情更值得照顾。'],
  closing: ['快下班了，今天的你也很辛苦，晚些好好放松吧。', '今天快走到终点了，给自己想一件下班后的开心事。', '再陪自己一小会儿，接下来就是属于你的时间了。'],
}

/** Stable within a local half-hour; varies by date, time and work phase. */
export function encouragementAt(now: number, status: WorkStatus, progress: number, remainingSeconds: number): string {
  const date = new Date(now)
  const phase = status === 'working'
    ? remainingSeconds <= 1800 ? 'closing' : progress < .25 ? 'early' : progress < .6 ? 'middle' : 'late'
    : (status === 'after' || status === 'rest') && date.getHours() >= 21 ? 'night' : status
  const choices = messages[phase]
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  const slot = date.getHours() * 2 + Math.floor(date.getMinutes() / 30)
  return choices[(day + slot) % choices.length]
}
