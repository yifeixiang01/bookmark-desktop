import { useState } from 'react'
import { Check } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { validSettings } from './model'
import type { SalaryApp } from './types'

const weekdays = [[1, '一'], [2, '二'], [3, '三'], [4, '四'], [5, '五'], [6, '六'], [0, '日']] as const

export function Settings({ app, onCancel, onSave }: { app: SalaryApp; onCancel: () => void; onSave: (settings: Omit<SalaryApp, 'type'>) => void }) {
  const [draft, setDraft] = useState(app)
  const [salary, setSalary] = useState(app.monthlySalary?.toString() ?? '')
  const settings = { ...draft, monthlySalary: Number(salary) }
  const valid = salary.trim() !== '' && validSettings(settings)
  const update = (field: 'start' | 'end' | 'lunchStart' | 'lunchEnd', value: string) => setDraft({ ...draft, [field]: value })
  return <Dialog open onOpenChange={open => { if (!open) onCancel() }}><DialogContent className="salary-settings-dialog sm:max-w-[420px]">
    <DialogHeader><DialogTitle>我的进账设置</DialogTitle><DialogDescription>按你的工作节奏，算好每一份收获。</DialogDescription></DialogHeader>
    <form className="salary-form" onSubmit={event => { event.preventDefault(); if (valid) onSave(settings) }}>
      <label className="salary-input-label">月薪（元）<input className="salary-monthly-input" type="number" inputMode="decimal" min="0.01" max="1000000000" step="0.01" placeholder="输入你的月薪" value={salary} onChange={event => setSalary(event.target.value)} required /></label>
      <div className="salary-form-times"><label>上班<input type="time" aria-label="上班时间" value={draft.start} onChange={e => update('start', e.target.value)} required /></label><label>下班<input type="time" aria-label="下班时间" value={draft.end} onChange={e => update('end', e.target.value)} required /></label></div>
      <label className="salary-lunch-toggle"><input type="checkbox" checked={draft.lunchEnabled} onChange={e => setDraft({ ...draft, lunchEnabled: e.target.checked })} />午休不计入工时</label>
      {draft.lunchEnabled && <div className="salary-form-times"><label>午休开始<input type="time" aria-label="午休开始" value={draft.lunchStart} onChange={e => update('lunchStart', e.target.value)} required /></label><label>午休结束<input type="time" aria-label="午休结束" value={draft.lunchEnd} onChange={e => update('lunchEnd', e.target.value)} required /></label></div>}
      <fieldset className="salary-workdays"><legend>每周工作日</legend><div>{weekdays.map(([day, label]) => <button key={day} type="button" aria-label={`周${label}`} aria-pressed={draft.workdays.includes(day)} onClick={() => setDraft({ ...draft, workdays: draft.workdays.includes(day) ? draft.workdays.filter(value => value !== day) : [...draft.workdays, day] })}>{label}</button>)}</div></fieldset>
      <p className="salary-calculation-note">按当月所选工作日均摊月薪，非工作时间暂停增长。剩余工作日含尚未下班的今天；法定节假日暂不扣除。使用设备本地时间，仅支持当天上下班；修改设置会重算本月估算，金额不代表实发工资。</p>
      {!valid && salary !== '' && <p className="salary-error" role="status">请填写有效月薪，检查时间顺序，并至少选择一个工作日。</p>}
      <div className="salary-form-actions"><button type="button" onClick={onCancel}>取消</button><button className="salary-save" type="submit" disabled={!valid}><Check size={14} />保存设置</button></div>
    </form>
  </DialogContent></Dialog>
}
