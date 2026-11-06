import { useCallback, useEffect, useRef, useState } from 'react'
import type { DesktopItem, GridPos } from '@/types/bookmark'
import { dragVisualOf, spanOf, type Span } from '@/lib/gridLayout'
import { dragState } from '@/lib/dragState'

/** 拖拽来源：桌面项目（书签/文件夹），或文件夹面板里的书签 */
export type DragSource =
  | { kind: 'desktop-item'; itemId: string }
  | { kind: 'panel-bookmark'; groupId: string; bookmarkId: string }

/** 网格的实时几何信息，由 DesktopGrid 每次渲染后写入；rect 命中时实时测量（随滚动变化） */
export interface GridFrame {
  el: HTMLElement
  offsetX: number
  cols: number
  /** 固定行数（由可视高度决定），命中与落位都钳制在 0..rows-span.h */
  rows: number
  colW: number
  rowH: number
  iconPx: number
  /** 网格整体缩放（保证纵向放 3 个文件夹）；el 的 getBoundingClientRect 是缩放后的屏幕尺寸 */
  scale: number
  items: DesktopItem[]
  placements: Map<string, GridPos>
}

/** 落点吸附动画参数：幽灵从松手位置飞到这里，到位后才提交数据 */
export interface SettleInfo {
  toX: number
  toY: number
  /** 飞行末段缩放：1=不变；>1=放大成文件夹瓷砖；<1=缩小被"吸"进目标 */
  scale: number
  /** 到达时是否淡出（合并/放入面板/无效落点） */
  fade: boolean
}

export interface DragInfo {
  source: DragSource
  /** 指针视口坐标（幽灵跟随用） */
  x: number
  y: number
  /** 吸附后的目标格（来源跨度左上角） */
  overCell: GridPos | null
  /** 指针下的桌面项目 */
  overItemId: string | null
  /** 指针是否在打开的文件夹面板上 */
  overPanel: boolean
  /** 悬停计时锁定的合并目标 */
  mergeTargetItemId: string | null
  /** 非空表示松手后的吸附动画进行中（期间忽略指针移动与新拖拽） */
  settle: SettleInfo | null
}

const MERGE_DELAY = 550
const MOUSE_THRESHOLD = 6
const TOUCH_HOLD = 420
const TOUCH_SLOP = 10
/** 落点吸附动画时长（Home 的幽灵过渡样式同步使用） */
export const SETTLE_MS = 190
/** 边缘自动滑动：指针距滚动容器左右边缘多少 px 内触发 */
const EDGE_ZONE = 60
/** 边缘滑动的最大速度（px/帧），越贴边越快 */
const EDGE_SPEED = 18

interface Opts {
  gridRef: React.RefObject<GridFrame | null>
  panelElRef: React.RefObject<HTMLDivElement | null>
  /** 桌面横向滚动容器：拖拽到其左右边缘时自动滑动（跨页拖拽） */
  scrollRef?: React.RefObject<HTMLDivElement | null>
  locked: boolean
  onPlace: (source: DragSource, cell: GridPos) => void
  onMerge: (source: DragSource, targetItemId: string) => void
  onDropIntoPanel: (source: DragSource) => void
}

function sourceSpan(source: DragSource, items: DesktopItem[]): Span {
  if (source.kind === 'panel-bookmark') return { w: 1, h: 1 }
  const it = items.find((i) => i.id === source.itemId)
  return it ? spanOf(it) : { w: 1, h: 1 }
}

function isBookmarkish(source: DragSource, items: DesktopItem[]): boolean {
  if (source.kind === 'panel-bookmark') return true
  const it = items.find((i) => i.id === source.itemId)
  return it?.kind === 'bookmark'
}

function desktopItemOf(source: DragSource, items: DesktopItem[]): DesktopItem | null {
  if (source.kind !== 'desktop-item') return null
  return items.find((i) => i.id === source.itemId) ?? null
}

/**
 * 桌面拖拽管理器：
 * - 鼠标按下移动 6px / 触屏长按 420ms 激活拖拽
 * - 幽灵图标以指针为中心跟随（不做节点锚定，杜绝漂移）
 * - 命中检测基于网格几何；悬停 550ms 锁定合并/加入文件夹
 * - 松手后幽灵先做落点吸附动画（飞到目标槽位），到位瞬间才提交数据
 */
export function useDesktopDrag(opts: Opts) {
  const [drag, setDrag] = useState<DragInfo | null>(null)
  const pendingRef = useRef<{
    source: DragSource
    startX: number
    startY: number
    isTouch: boolean
    holdTimer?: ReturnType<typeof setTimeout>
  } | null>(null)
  const dragRef = useRef<DragInfo | null>(null)
  const mergeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const optsRef = useRef(opts)
  optsRef.current = opts

  const setBoth = (d: DragInfo | null) => {
    dragRef.current = d
    dragState.active = !!d
    setDrag(d)
  }

  // ---- 边缘自动滑动（跨页拖拽）：指针停在容器左右边缘时持续滑动，并重算命中格 ----
  const pointerPos = useRef({ x: 0, y: 0 })
  const edgeRaf = useRef<number | undefined>(undefined)

  const stopEdgeScroll = () => {
    if (edgeRaf.current !== undefined) cancelAnimationFrame(edgeRaf.current)
    edgeRaf.current = undefined
  }

  const edgeTick = () => {
    edgeRaf.current = undefined
    const d = dragRef.current
    const el = optsRef.current.scrollRef?.current
    if (!d || d.settle || !el) return
    const r = el.getBoundingClientRect()
    const px = pointerPos.current.x
    let vx = 0
    if (px < r.left + EDGE_ZONE) vx = -((r.left + EDGE_ZONE - px) / EDGE_ZONE) * EDGE_SPEED
    else if (px > r.right - EDGE_ZONE) vx = ((px - (r.right - EDGE_ZONE)) / EDGE_ZONE) * EDGE_SPEED
    if (!vx) return // 不在边缘区，等下一次指针移动再调度
    const before = el.scrollLeft
    el.scrollLeft += vx
    if (el.scrollLeft !== before) {
      // 网格在指针下方移动了：重算命中格，让"排开"预览和指示框跟着滑动走
      const hit = hitTest(pointerPos.current.x, pointerPos.current.y, d.source)
      const cur = dragRef.current
      if (cur && (hit.overCell?.x !== cur.overCell?.x || hit.overCell?.y !== cur.overCell?.y || hit.overItemId !== cur.overItemId)) {
        setBoth({ ...cur, ...hit })
      }
    }
    edgeRaf.current = requestAnimationFrame(edgeTick)
  }

  const scheduleEdgeScroll = (x: number, y: number) => {
    pointerPos.current = { x, y }
    if (edgeRaf.current === undefined) edgeRaf.current = requestAnimationFrame(edgeTick)
  }

  const press = useCallback(
    (e: React.PointerEvent, source: DragSource) => {
      if (optsRef.current.locked) return
      if (dragRef.current) return // 吸附动画进行中，忽略新按压
      if (e.pointerType === 'mouse' && e.button !== 0) return
      clearTimeout(pendingRef.current?.holdTimer)
      const pending: {
        source: DragSource
        startX: number
        startY: number
        isTouch: boolean
        holdTimer?: ReturnType<typeof setTimeout>
      } = {
        source,
        startX: e.clientX,
        startY: e.clientY,
        isTouch: e.pointerType !== 'mouse',
      }
      if (pending.isTouch) {
        pending.holdTimer = setTimeout(() => {
          if (pendingRef.current === pending) activate(pending.source, pending.startX, pending.startY)
        }, TOUCH_HOLD) as unknown as ReturnType<typeof setTimeout>
      }
      pendingRef.current = pending
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  function activate(source: DragSource, x: number, y: number) {
    setBoth({
      source,
      x,
      y,
      overCell: null,
      overItemId: null,
      overPanel: false,
      mergeTargetItemId: null,
      settle: null,
    })
  }

  const hitTest = (x: number, y: number, source: DragSource): Pick<DragInfo, 'overCell' | 'overItemId' | 'overPanel'> => {
    const { gridRef, panelElRef } = optsRef.current
    const panelEl = panelElRef.current
    const overPanel = (() => {
      if (!panelEl) return false
      const r = panelEl.getBoundingClientRect()
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    })()

    const g = gridRef.current
    if (!g) return { overCell: null, overItemId: null, overPanel }
    const rect = g.el.getBoundingClientRect()
    const span = sourceSpan(source, g.items)
    // rect 是缩放后的屏幕尺寸，先换算回网格逻辑坐标
    const relX = (x - rect.left - g.offsetX * g.scale) / g.scale
    const relY = (y - rect.top) / g.scale
    if (relX < -g.colW || relX > g.cols * g.colW + g.colW || relY < -g.rowH * 2) {
      return { overCell: null, overItemId: null, overPanel }
    }
    const cx = Math.max(0, Math.min(Math.floor(relX / g.colW), g.cols - span.w))
    const cy = Math.max(0, Math.min(Math.floor(relY / g.rowH), Math.max(0, g.rows - span.h)))
    let overItemId: string | null = null
    for (const it of g.items) {
      if (source.kind === 'desktop-item' && it.id === source.itemId) continue
      const p = g.placements.get(it.id)
      if (!p) continue
      const s = spanOf(it)
      if (cx >= p.x && cx < p.x + s.w && cy >= p.y && cy < p.y + s.h) {
        overItemId = it.id
        break
      }
    }
    return { overCell: { x: cx, y: cy }, overItemId, overPanel }
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const pending = pendingRef.current
      const d = dragRef.current
      if (!d && pending) {
        const dist = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY)
        if (pending.isTouch) {
          if (dist > TOUCH_SLOP) {
            clearTimeout(pending.holdTimer)
            pendingRef.current = null // 触屏移动视为滚动，放弃本次拖拽
          }
        } else if (dist > MOUSE_THRESHOLD) {
          activate(pending.source, e.clientX, e.clientY)
        }
        return
      }
      if (!d || d.settle) return
      e.preventDefault()
      scheduleEdgeScroll(e.clientX, e.clientY)
      const hit = hitTest(e.clientX, e.clientY, d.source)
      const items = optsRef.current.gridRef.current?.items ?? []

      let mergeTargetItemId = d.mergeTargetItemId
      if (hit.overItemId !== d.overItemId) {
        clearTimeout(mergeTimer.current)
        mergeTargetItemId = null
        if (hit.overItemId && isBookmarkish(d.source, items)) {
          const targetId = hit.overItemId
          mergeTimer.current = setTimeout(() => {
            setBoth(dragRef.current ? { ...dragRef.current, mergeTargetItemId: targetId } : null)
          }, MERGE_DELAY)
        }
      }
      setBoth({ ...d, x: e.clientX, y: e.clientY, ...hit, mergeTargetItemId })
    }

    const onUp = (e: PointerEvent) => {
      const pending = pendingRef.current
      const d = dragRef.current
      clearTimeout(pending?.holdTimer)
      pendingRef.current = null
      clearTimeout(mergeTimer.current)
      stopEdgeScroll()
      if (!d || d.settle) return
      // 最终落点以松手位置重新判定（与最后一次 move 之间可能有空档）
      const hit = hitTest(e.clientX, e.clientY, d.source)
      const final: DragInfo = { ...d, ...hit }
      const { onPlace, onMerge, onDropIntoPanel } = optsRef.current
      const items = optsRef.current.gridRef.current?.items ?? []

      dragState.suppressClick = true
      setTimeout(() => { dragState.suppressClick = false }, 350)

      // ---- 落点吸附动画：计算幽灵的飞行终点（目标槽位图标的可视中心） ----
      const g = optsRef.current.gridRef.current
      const grect = g?.el.getBoundingClientRect() ?? null
      const iconPx = g?.iconPx ?? 56
      // 幽灵锚点（translate -50%,-80%，含下方名称标签）到图标中心的纵向偏移
      const ghostDy = Math.round(iconPx * 0.3 + 21)

      const slotIconCenter = (cell: GridPos, span: Span, visual: { w: number; h: number }) => {
        if (!g || !grect) return null
        // 与 DesktopGrid 实际渲染一致：水平居中于格区、垂直顶部对齐（top + 2）；再乘整体缩放
        const s = g.scale
        return {
          x: grect.left + g.offsetX * s + (cell.x * g.colW + (span.w * g.colW - visual.w) / 2 + visual.w / 2) * s,
          y: grect.top + (cell.y * g.rowH + 2 + visual.h / 2) * s,
        }
      }
      const panelCenter = () => {
        const el = optsRef.current.panelElRef.current
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      }

      type Plan = {
        to: { x: number; y: number } | null
        scale: number
        fade: boolean
        commit: (() => void) | null
      }
      let plan: Plan

      const mergeTargetId = final.mergeTargetItemId
      if (mergeTargetId && isBookmarkish(final.source, items)) {
        // 合并：缩小飞入目标图标/文件夹
        const target = items.find((i) => i.id === mergeTargetId) ?? null
        const p = target ? g?.placements.get(target.id) : null
        const c = target && p ? slotIconCenter(p, spanOf(target), dragVisualOf(target, iconPx)) : null
        plan = {
          to: c ? { x: c.x, y: c.y + ghostDy } : null,
          scale: 0.25,
          fade: true,
          commit: () => onMerge(final.source, mergeTargetId),
        }
      } else if (final.overPanel && final.source.kind === 'desktop-item' && isBookmarkish(final.source, items)) {
        // 放入打开的文件夹面板：缩小飞入面板中心
        plan = {
          to: panelCenter(),
          scale: 0.25,
          fade: true,
          commit: () => onDropIntoPanel(final.source),
        }
      } else if (final.overCell && !final.overPanel) {
        // 常规落位：幽灵飞到目标槽位（文件夹顺带放大成瓷砖尺寸），到位即提交
        const srcItem = desktopItemOf(final.source, items)
        const span = sourceSpan(final.source, items)
        const visual = dragVisualOf(srcItem, iconPx)
        const c = slotIconCenter(final.overCell, span, visual)
        const cell = final.overCell
        plan = {
          to: c ? { x: c.x, y: c.y + ghostDy } : null,
          scale: srcItem?.kind === 'group' ? visual.w / iconPx : 1,
          fade: false,
          commit: () => {
            // 标记后提交：DesktopGrid 下一次渲染让该项目直接出现在新格，禁掉旧位置滑动
            if (final.source.kind === 'desktop-item') dragState.lastPlacedItemId = final.source.itemId
            onPlace(final.source, cell)
          },
        }
      } else {
        // 无效落点：飞回原槽位（桌面项目），或原地淡出（面板书签/无几何信息）
        const srcItem = desktopItemOf(final.source, items)
        const p = srcItem ? g?.placements.get(srcItem.id) : null
        const c = srcItem && p ? slotIconCenter(p, spanOf(srcItem), dragVisualOf(srcItem, iconPx)) : null
        plan = c
          ? {
              to: { x: c.x, y: c.y + ghostDy },
              scale: srcItem?.kind === 'group' ? dragVisualOf(srcItem, iconPx).w / iconPx : 1,
              fade: false,
              commit: null,
            }
          : { to: null, scale: 0.6, fade: true, commit: null }
      }

      if (!plan.to) {
        // 无法计算目标位置时退化为直接提交/取消
        plan.commit?.()
        setBoth(null)
        return
      }
      const commit = plan.commit
      settleTimer.current = setTimeout(() => {
        settleTimer.current = undefined
        commit?.()
        setBoth(null)
      }, SETTLE_MS)
      setBoth({ ...final, settle: { toX: plan.to.x, toY: plan.to.y, scale: plan.scale, fade: plan.fade } })
    }

    const onCancel = () => {
      clearTimeout(pendingRef.current?.holdTimer)
      clearTimeout(mergeTimer.current)
      clearTimeout(settleTimer.current)
      stopEdgeScroll()
      settleTimer.current = undefined
      pendingRef.current = null
      setBoth(null)
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('blur', onCancel)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('blur', onCancel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { drag, press }
}
