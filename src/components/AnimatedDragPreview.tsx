import { useLayoutEffect, useRef } from 'react'

/** Mirror the current animated DOM instead of mounting a second app instance. */
export function AnimatedDragPreview({ source }: { source: HTMLElement | null }) {
  const host = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!source || !host.current) return
    const clone = source.cloneNode(true) as HTMLElement
    // Scope SVG clip IDs to the preview so it cannot affect the original strokes.
    const suffix = '-drag-preview'
    for (const node of clone.querySelectorAll('[id]')) node.id += suffix
    for (const node of clone.querySelectorAll('[clip-path]')) {
      node.setAttribute('clip-path', node.getAttribute('clip-path')!.replace(/\)$/, `${suffix})`))
    }
    host.current.replaceChildren(clone)
    const originals = [source, ...source.querySelectorAll<HTMLElement | SVGElement>('*')]
    const copies = [clone, ...clone.querySelectorAll<HTMLElement | SVGElement>('*')]
    for (let i = 0; i < originals.length; i++) {
      const animations = originals[i].getAnimations()
      const mirrored = copies[i].getAnimations()
      for (let j = 0; j < animations.length; j++) {
        if (mirrored[j]) {
          mirrored[j].currentTime = animations[j].currentTime
          mirrored[j].playbackRate = animations[j].playbackRate
          if (animations[j].playState === 'paused') mirrored[j].pause()
        }
      }
    }
    return () => { clone.remove() }
  }, [source])
  return <div ref={host} aria-hidden="true" />
}
