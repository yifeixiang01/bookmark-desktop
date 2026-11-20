import { useEffect, useState } from 'react'
import { ArrowUpRight, Coffee, Eye, EyeOff, RefreshCw, Settings2, Sparkles, TrendingUp } from 'lucide-react'
import type { AppCardProps } from '../types'
import { CardFrame } from '../CardFrame'
import { salarySnapshot, validSettings } from './model'
import { Settings } from './Settings'
import { IncomeAmount } from './IncomeAmount'
import type { SalaryApp } from './types'
import './styles.css'

const money = (amount: number, digits = 2) => amount.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const duration = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds + 1e-6))
  return `${Math.floor(total / 3600)}:${String(Math.floor(total / 60) % 60).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
const statusLabels = { before: '等待开工', working: '努力正在入账', lunch: '午休充电中', after: '今日已收工', rest: '今天休息' }
const extraEncouragement = {
  before: ['不用急着做到最好，带着自己的节奏慢慢来。', '愿今天的你，被一杯热水和一点好心情温柔接住。'],
  working: ['你已经做得很好了，眼前的这一点点也值得被看见。', '如果有些累，就轻轻休息一下，我会陪你把今天走完。'],
  lunch: ['先照顾好自己，吃一顿安稳的饭，下午再慢慢来。', '愿这段午休让你重新蓄满一点温柔的力气。'],
  after: ['今天辛苦了，你为生活付出的每一点都值得肯定。', '下班啦，把时间还给自己，好好享受今晚的安宁。'],
  rest: ['今天不用赶路，安心休息本身就是很重要的事。', '愿你在自己的生活里慢慢充电，也被日常温柔对待。'],
}

export function Card(props: AppCardProps) {
  if (props.app.type !== 'salary') return null
  return <CardFrame {...props} name="上班鼓励器" background="salary-card"><Salary app={props.app} disabled={!!props.editMode || !!props.preview} preview={!!props.preview} onSave={settings => props.onAction?.({ type: 'salary-configure', settings })} /></CardFrame>
}

function Salary({ app, disabled, preview, onSave }: { app: SalaryApp; disabled: boolean; preview: boolean; onSave: (settings: Omit<SalaryApp, 'type'>) => void }) {
  const [clock, setClock] = useState<{ now: number; previous: number | null }>(() => ({ now: Date.now(), previous: null }))
  const now = clock.now
  const [editing, setEditing] = useState<SalaryApp | null>(null)
  const [hidden, setHidden] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  useEffect(() => {
    if (preview || app.monthlySalary === null) return
    const update = () => {
      if (document.hidden) return
      const next = Date.now()
      setClock(current => ({ now: next, previous: next - current.now >= 500 && next - current.now <= 1600 ? current.now : null }))
    }
    const timer = window.setInterval(update, 1000)
    document.addEventListener('visibilitychange', update)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update) }
  }, [preview, app.monthlySalary])
  const previewTime = new Date(now)
  if (preview) { previewTime.setFullYear(2026, 10, 18); previewTime.setHours(14, 36, 20, 0) }
  const data = salarySnapshot(app, preview ? previewTime.getTime() : now)
  const previous = clock.previous === null ? null : salarySnapshot(app, clock.previous)
  const earning = data.status === 'working' && !hidden && !disabled && !editing
  const gain = earning && previous?.status === 'working' ? data.earned - previous.earned : 0
  const amount = (value: number, digits = 2) => hidden ? '••••' : money(value, digits)
  const encouragement = [data.encouragement, ...extraEncouragement[data.status]][messageIndex % 3]
  const save = (settings: Omit<SalaryApp, 'type'>) => { onSave(settings); setClock({ now: Date.now(), previous: null }); setEditing(null) }

  return <>
    {app.monthlySalary === null ? <Welcome app={app} disabled={disabled} onSave={save} onSettings={setEditing} /> : <div className="salary-content" data-status={data.status} data-earning={earning}>
      <div className="salary-status-row"><span className="salary-status"><i />{statusLabels[data.status]}</span><div className="salary-tools"><button type="button" aria-label={hidden ? '显示收入金额' : '隐藏收入金额'} aria-pressed={hidden} title={hidden ? '显示金额' : '隐藏金额'} disabled={disabled} onClick={() => setHidden(!hidden)}>{hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button><button type="button" aria-label="设置薪资与工作时间" title="设置薪资与工作时间" disabled={disabled} onClick={() => setEditing(app)}><Settings2 size={13} /></button></div></div>
      <div className="salary-hero"><div className="salary-hero-heading"><span>今日已赚</span>{gain > 0 ? <span key={now} className="salary-income-pop" aria-hidden="true"><ArrowUpRight size={11} />+¥{money(gain, 4)}</span> : <ArrowUpRight size={15} />}</div><div className="salary-amount" data-long={!hidden && money(data.earned).length > 10}><small>¥</small><strong><IncomeAmount text={amount(data.earned)} animate={earning} /></strong></div><div className="salary-hero-glow" aria-hidden="true" /><div className="salary-income-sheen" aria-hidden="true" /></div>
      <div className="salary-rates"><div><span>每秒进账</span><b>¥{amount(data.perSecond, 4)}</b></div><div><span>时薪</span><b>¥{amount(data.hourly)}</b></div><div><span>日薪</span><b>¥{amount(data.daily)}</b></div></div>
      <div className="salary-month"><div><span>本月已赚</span><b>¥<IncomeAmount text={amount(data.monthEarned)} animate={earning} /></b></div><p>还剩 <strong>{data.remainingDays}</strong> 个工作日</p></div>
      <div className="salary-clock"><div className="salary-time"><div><span>今日已工作</span><b>{duration(data.workedSeconds)}</b></div><div><span>{data.status === 'rest' ? '休息日' : data.status === 'after' ? '下班啦' : '距离下班'}</span><b>{data.status === 'rest' || data.status === 'after' ? <Coffee size={15} /> : duration(data.remainingSeconds)}</b></div></div><div className="salary-progress" role="progressbar" aria-label="今日工作进度" aria-valuenow={Math.round(data.progress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${data.progress * 100}%` }} /></div></div>
      <button type="button" className="salary-encouragement" aria-label="换一句鼓励" title="点击换一句鼓励" disabled={disabled} onClick={() => setMessageIndex(value => value + 1)}><Sparkles size={12} /><span key={`${data.status}-${messageIndex}`}>{encouragement}</span><RefreshCw size={11} className="salary-refresh" /></button>
    </div>}
    {editing && !disabled && <Settings app={editing} onCancel={() => setEditing(null)} onSave={save} />}
  </>
}

function Welcome({ app, disabled, onSave, onSettings }: { app: SalaryApp; disabled: boolean; onSave: (settings: Omit<SalaryApp, 'type'>) => void; onSettings: (settings: SalaryApp) => void }) {
  const [salary, setSalary] = useState('')
  const settings = { ...app, monthlySalary: Number(salary) }
  const valid = salary.trim() !== '' && validSettings(settings)
  return <form className="salary-welcome" onSubmit={event => { event.preventDefault(); if (valid && !disabled) onSave(settings) }}>
    <span className="salary-welcome-icon"><TrendingUp size={22} strokeWidth={1.6} /></span>
    <div><h4>让每一份努力，都看得见。</h4><p>为认真生活的你，攒一点底气。</p></div>
    <label>你的月薪（元）<input type="number" inputMode="decimal" min="0.01" max="1000000000" step="0.01" placeholder="例如 15000" value={salary} disabled={disabled} onChange={event => setSalary(event.target.value)} required /></label>
    <button type="submit" className="salary-save" disabled={!valid || disabled}>开启进账时刻 <ArrowUpRight size={14} /></button>
    <button type="button" className="salary-schedule-link" disabled={disabled} onClick={() => onSettings(valid ? settings : app)}>默认朝九晚六 · 双休 <Settings2 size={11} /></button>
  </form>
}
