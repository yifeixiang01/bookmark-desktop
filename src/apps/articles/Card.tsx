import { BookOpen, ArrowUpRight } from 'lucide-react'
import { CardFrame } from '../CardFrame'
import type { AppCardProps } from '../types'
import { trpc } from '@/providers/trpc'
import { dragState } from '@/lib/dragState'

export function Card(props: AppCardProps) {
  const list = trpc.articles.list.useQuery(undefined, { enabled: !props.preview, refetchOnWindowFocus: true })
  return <CardFrame {...props} name="文章收藏" background="bg-[#f5f8f6]/95">
    <div className="article-desktop-card">
      <div className="article-card-summary"><BookOpen size={28} strokeWidth={1.5} /><span>{props.preview ? '集中管理你的文章' : list.isLoading ? '正在加载…' : list.isError ? '打开文章库后重试' : `${list.data?.length ?? 0} 篇收藏`}</span></div>
      <p>按标签整理，用备注留下线索。</p>
      <button disabled={props.preview || props.editMode} onClick={() => { if (!dragState.suppressClick) window.dispatchEvent(new Event('open-article-library')) }}>打开文章库<ArrowUpRight size={16} /></button>
    </div>
  </CardFrame>
}
