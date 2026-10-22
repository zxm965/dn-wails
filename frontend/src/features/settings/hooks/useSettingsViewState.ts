import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

import { settingsViewSession, type SettingsCategory } from '../lib/settingsViewSession'

export function useSettingsViewState(panelRef: RefObject<HTMLDivElement | null>, ready: boolean) {
  const [activeCategory, setActiveCategory] = useState(settingsViewSession.category)
  const scrollContainer = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (!ready || !panelRef.current) return
    let parent = panelRef.current.parentElement
    while (parent && !/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) parent = parent.parentElement
    if (!parent) return
    const container = parent
    scrollContainer.current = container
    container.scrollTop = settingsViewSession.scrollOffsets[activeCategory] ?? 0
    const remember = () => {
      settingsViewSession.scrollOffsets[activeCategory] = container.scrollTop
    }
    container.addEventListener('scroll', remember, { passive: true })
    return () => {
      container.removeEventListener('scroll', remember)
      scrollContainer.current = null
    }
  }, [activeCategory, panelRef, ready])

  function selectCategory(category: SettingsCategory, resetScroll = false) {
    if (scrollContainer.current) {
      settingsViewSession.scrollOffsets[activeCategory] = scrollContainer.current.scrollTop
    }
    if (resetScroll) settingsViewSession.scrollOffsets[category] = 0
    settingsViewSession.category = category
    setActiveCategory(category)
  }

  return { activeCategory, selectCategory }
}
