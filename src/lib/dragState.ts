/**
 * 拖拽相关的全局瞬时标记（不进 React 状态，避免高频重渲染）：
 * - suppressClick：拖拽松手后抑制一次误触发的 click（防误跳转）
 * - active：当前有拖拽进行中（悬停提示等在拖拽时不显示）
 * - lastPlacedItemId：落点吸附动画结束时提交的项目 id；
 *   DesktopGrid 在紧随其后的那次渲染中为它禁用 left/top 过渡
 *   （幽灵已飞到目标格，真实项目须直接出现在格内，不能从旧位置滑过来）
 */
export const dragState = {
  suppressClick: false,
  active: false,
  lastPlacedItemId: null as string | null,
}
