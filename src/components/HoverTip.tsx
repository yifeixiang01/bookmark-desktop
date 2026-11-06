import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { dragState } from '@/lib/dragState'

/**
 * 悬停延迟提示（手机桌面长按看详情的桌面版）：
 * 鼠标移入 delay 毫秒后显示，移出/按下/开始拖拽/滚动立即消失。
 * rect 在显示瞬间从触发元素采样，供 TipBubble 用 fixed 定位（不被滚动容器裁剪）。
 */
export function useHoverTip(delay = 600) {
  const [show, setShow] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const elRef = useRef<HTMLElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hide = () => {
    clearTimeout(timer.current)
    setShow(false)
  }
  const bind = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      elRef.current = e.currentTarget
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (!dragState.active && elRef.current) {
          setRect(elRef.current.getBoundingClientRect())
          setShow(true)
        }
      }, delay)
    },
    onMouseLeave: hide,
    onPointerDown: hide,
  }

  // 气泡显示期间，任何滚动/滚轮都会让锚点位置失效 → 立即隐藏
  useEffect(() => {
    if (!show) return
    window.addEventListener('wheel', hide, { passive: true })
    window.addEventListener('scroll', hide, { capture: true, passive: true })
    return () => {
      window.removeEventListener('wheel', hide)
      window.removeEventListener('scroll', hide, { capture: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  return { show, rect, bind }
}

/**
 * 气泡本体：名称 + 描述（无描述时退化为域名），毛玻璃深色风格。
 * 通过 createPortal 挂到 body 并用 fixed 定位 + 视口边缘钳制，
 * 不会被横向滚动的桌面列表裁剪；顶部空间不足时翻到元素下方。
 */
export function TipBubble({
  name,
  description,
  url,
  rect,
}: {
  name: string
  description?: string
  url: string
  rect: DOMRect | null
}) {
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; arrowX: number; above: boolean } | null>(null)

  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  })()

  useLayoutEffect(() => {
    const el = bubbleRef.current
    if (!rect || !el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const anchorCx = rect.left + rect.width / 2
    // 水平方向钳制在视口内（留 8px 边距）
    const cx = Math.min(Math.max(anchorCx, w / 2 + 8), window.innerWidth - w / 2 - 8)
    const above = rect.top - h - 12 >= 8
    setPos({
      left: cx,
      top: above ? rect.top - h - 12 : rect.bottom + 12,
      // 箭头始终对准锚点中心（相对气泡左缘的偏移）
      arrowX: anchorCx - (cx - w / 2),
      above,
    })
  }, [rect])

  return createPortal(
    <div
      ref={bubbleRef}
      className="tip-pop pointer-events-none fixed z-[90] w-max max-w-60 rounded-2xl border border-white/15 bg-black/65 px-3.5 py-2 text-center shadow-xl shadow-black/30 backdrop-blur-xl"
      style={
        pos
          ? { left: pos.left, top: pos.top, transform: 'translateX(-50%)' }
          : { left: -9999, top: -9999 }
      }
    >
      <p className="text-[13px] font-medium leading-snug text-white">{name}</p>
      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/70">{description?.trim() || host}</p>
      {pos && (
        <span
          className={`absolute -translate-x-1/2 border-[6px] border-transparent ${
            pos.above ? 'top-full border-t-black/65' : 'bottom-full border-b-black/65'
          }`}
          style={{ left: pos.arrowX }}
        />
      )}
    </div>,
    document.body
  )
}
