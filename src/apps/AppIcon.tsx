import { BookOpen, Cat, CircleDot, Droplets, ListTodo, NotebookPen, Timer, TrendingUp } from 'lucide-react'
import type { AppType } from './types'

const icons = {
  answers: BookOpen,
  salary: TrendingUp,
  pomodoro: Timer,
  note: NotebookPen,
  todo: ListTodo,
  water: Droplets,
  woodfish: CircleDot,
  pet: Cat,
}

const colors = {
  answers: 'bg-[#eee9d9] text-[#405c4c]',
  salary: 'bg-emerald-50 text-emerald-800',
  pomodoro: 'bg-rose-50 text-rose-700',
  note: 'bg-blue-50 text-blue-700',
  todo: 'bg-emerald-50 text-emerald-700',
  water: 'bg-cyan-50 text-cyan-700',
  woodfish: 'bg-amber-50 text-amber-800',
  pet: 'bg-stone-100 text-stone-700',
}

/** Shared vector icons for the app catalog, previews and desktop cards. */
export function AppIcon({ type, compact = false }: { type: AppType | 'pet'; compact?: boolean }) {
  const Icon = icons[type]
  return <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center ${compact ? 'h-7 w-7 rounded-lg' : 'h-11 w-11 rounded-xl'} ${colors[type]}`}>
    <Icon size={compact ? 16 : 21} strokeWidth={1.8} />
  </span>
}
