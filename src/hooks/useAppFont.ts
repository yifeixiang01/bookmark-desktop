import { useLayoutEffect } from 'react'
import { FONT_OPTIONS, normalizeFont, normalizeFontScale } from '@/lib/fonts'

/** Apply to the document so dialogs and tooltips portaled to body inherit it too. */
export function useAppFont(value: unknown, size?: unknown) {
  const font = normalizeFont(value)
  const scale = normalizeFontScale(size)
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--app-font-family', FONT_OPTIONS.find((option) => option.id === font)!.family)
    return () => { document.documentElement.style.removeProperty('--app-font-family') }
  }, [font])
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--app-font-scale', String(scale / 100))
    return () => { document.documentElement.style.removeProperty('--app-font-scale') }
  }, [scale])
}
