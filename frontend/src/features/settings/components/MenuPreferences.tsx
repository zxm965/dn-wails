import { ArrowDown, ArrowUp, GripVertical, RotateCcw } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'

import { Button, Switch } from '@/shared/components/ui'
import { useListMotion, type ListMotionOrigin } from '@/shared/hooks/useListMotion'
import { getOrderedMenuGroups, isMenuEntryVisible } from '@/shared/navigation'

import { useSettings } from '../context/SettingsProvider'

import { styles } from './MenuPreferences.css'

interface DragOrder {
  group: string
  key: string
  label: string
  keys: string[]
  base: string
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  width: number
  height: number
  x: number
  y: number
  moved: boolean
  targetKey: string | null
  placement: 'before' | 'after' | null
  insertionIndex: number | null
}

export function MenuPreferences() {
  const { settings, updateSettings, isSaving } = useSettings()
  const [draft, setDraft] = useState<DragOrder | null>(null)
  const drag = useRef<DragOrder | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const dropOrigin = useRef<ListMotionOrigin | null>(null)
  const scrollSnapshot = useRef<Array<{ element: HTMLElement; top: number; left: number }>>([])
  const [announcement, setAnnouncement] = useState('')
  const order = settings.navigation.menuOrder
  const signature = JSON.stringify(order)
  const groups = getOrderedMenuGroups(order)
  const listRef = useListMotion(signature, dropOrigin)
  const dragging = Boolean(draft)

  function rememberScroll() {
    const snapshot: typeof scrollSnapshot.current = []
    for (let element = listRef.current?.parentElement; element; element = element.parentElement) {
      snapshot.push({ element, top: element.scrollTop, left: element.scrollLeft })
    }
    scrollSnapshot.current = snapshot
  }

  useLayoutEffect(() => {
    for (const { element, top, left } of scrollSnapshot.current) {
      element.scrollTop = top
      element.scrollLeft = left
    }
    scrollSnapshot.current = []
  }, [signature])

  useEffect(() => {
    if (!dragging) return
    let frame = 0
    let previousTime = 0
    let scroller = listRef.current?.parentElement
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement
    const tick = (time: number) => {
      const current = drag.current
      if (!current) return
      if (current.base !== signature) {
        endDrag(false)
        return
      }
      if (scroller && current.moved) {
        const rect = scroller.getBoundingClientRect()
        const edge = 48
        const y = pointer.current.y
        const x = pointer.current.x
        const speed = y < rect.top + edge ? -1 : y > rect.bottom - edge ? 1 : 0
        if (x >= rect.left && x <= rect.right && y >= rect.top - edge && y <= rect.bottom + edge) {
          scroller.scrollTop += speed * Math.min(time - (previousTime || time), 32) * 0.5
        }
      }
      previousTime = time
      updateDrag(pointer.current.x, pointer.current.y)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const cancel = () => endDrag(false)
    window.addEventListener('blur', cancel)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('blur', cancel)
    }
  }, [dragging, signature])

  function saveOrder(group: string, keys: string[]) {
    rememberScroll()
    void updateSettings((current) => ({
      ...current,
      navigation: { ...current.navigation, menuOrder: { ...current.navigation.menuOrder, [group]: keys } },
    })).catch(() => setAnnouncement('排序保存失败，请查看设置错误提示。'))
  }

  function move(group: string, keys: string[], key: string, offset: number) {
    const from = keys.indexOf(key)
    const to = from + offset
    if (from < 0 || to < 0 || to >= keys.length) return
    const next = [...keys]
    next.splice(to, 0, next.splice(from, 1)[0])
    saveOrder(group, next)
    setAnnouncement(`已移至第 ${to + 1} 项，共 ${keys.length} 项。`)
  }

  function startDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    group: string,
    key: string,
    label: string,
    keys: string[],
  ) {
    if (event.button !== 0 || drag.current) return
    const row = event.currentTarget.closest<HTMLElement>('[data-order-key]')
    if (!row) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = row.getBoundingClientRect()
    pointer.current = { x: event.clientX, y: event.clientY }
    drag.current = {
      group,
      key,
      label,
      keys,
      base: signature,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      moved: false,
      targetKey: null,
      placement: null,
      insertionIndex: null,
    }
    setDraft(drag.current)
  }

  function updateDrag(x: number, y: number) {
    const current = drag.current
    if (!current || current.base !== signature) return
    const moved = current.moved || Math.hypot(x - current.startX, y - current.startY) >= 5
    let targetKey: string | null = null
    let placement: DragOrder['placement'] = null
    let insertionIndex: number | null = null
    if (moved) {
      const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-order-key]')
      if (
        target &&
        listRef.current?.contains(target) &&
        target.dataset.orderGroup === current.group &&
        target.dataset.orderKey !== current.key
      ) {
        const from = current.keys.indexOf(current.key)
        const to = current.keys.indexOf(target.dataset.orderKey!)
        const after = y >= target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2
        const index = to + (after ? 1 : 0) - (from < to ? 1 : 0)
        if (to >= 0 && index !== from) {
          targetKey = target.dataset.orderKey!
          placement = after ? 'after' : 'before'
          insertionIndex = index
        }
      }
    }
    const next = {
      ...current,
      x: x - current.offsetX,
      y: y - current.offsetY,
      moved,
      targetKey,
      placement,
      insertionIndex,
    }
    if (
      next.x === current.x &&
      next.y === current.y &&
      moved === current.moved &&
      targetKey === current.targetKey &&
      placement === current.placement
    )
      return
    drag.current = next
    setDraft(next)
  }

  function endDrag(commit: boolean) {
    const current = drag.current
    drag.current = null
    setDraft(null)
    if (commit && current?.moved && current.base === signature && current.insertionIndex !== null) {
      const next = [...current.keys]
      const from = next.indexOf(current.key)
      next.splice(current.insertionIndex, 0, next.splice(from, 1)[0])
      dropOrigin.current = { key: current.key, left: current.x, top: current.y }
      saveOrder(current.group, next)
      setAnnouncement(`已移至第 ${current.insertionIndex + 1} 项，共 ${next.length} 项。`)
    }
  }

  function controls(group: string, key: string, label: string, keys: string[]) {
    const index = keys.indexOf(key)
    return (
      <div className={styles.actions}>
        <Button
          variant='ghost'
          onPointerDown={(event) => {
            event.preventDefault()
            event.currentTarget.focus({ preventScroll: true })
          }}
          aria-label={`上移${label}`}
          title={`上移${label}`}
          disabled={index === 0 || Boolean(draft)}
          onClick={() => move(group, keys, key, -1)}
        >
          <ArrowUp size={15} />
        </Button>
        <Button
          variant='ghost'
          onPointerDown={(event) => {
            event.preventDefault()
            event.currentTarget.focus({ preventScroll: true })
          }}
          aria-label={`下移${label}`}
          title={`下移${label}`}
          disabled={index === keys.length - 1 || Boolean(draft)}
          onClick={() => move(group, keys, key, 1)}
        >
          <ArrowDown size={15} />
        </Button>
      </div>
    )
  }

  function handle(group: string, key: string, label: string, keys: string[]) {
    return (
      <Button
        variant='ghost'
        ripple={false}
        className={styles.handle}
        aria-label={`拖动排序${label}，或用上下方向键移动`}
        title='拖动排序，或使用上下方向键'
        onPointerDown={(event) => startDrag(event, group, key, label, keys)}
        onPointerMove={(event) => {
          pointer.current = { x: event.clientX, y: event.clientY }
        }}
        onPointerUp={(event) => {
          updateDrag(event.clientX, event.clientY)
          endDrag(true)
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => endDrag(false)}
        onLostPointerCapture={() => endDrag(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            endDrag(false)
            return
          }
          if (!draft && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
            event.preventDefault()
            move(group, keys, key, event.key === 'ArrowUp' ? -1 : 1)
          }
        }}
      >
        <GripVertical size={16} />
      </Button>
    )
  }

  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <div className={styles.copy}>
          <h2 className={styles.title}>左侧菜单</h2>
          <p className={styles.description}>
            拖动手柄到同组插入线后松开，或使用上下按钮调整顺序；修改自动保存，隐藏后仍保留位置。
          </p>
        </div>
        <Button
          variant='secondary'
          disabled={isSaving || Boolean(draft) || Object.keys(order).length === 0}
          onClick={() => {
            rememberScroll()
            void updateSettings((current) => ({
              ...current,
              navigation: { ...current.navigation, menuOrder: {} },
            })).catch(() => setAnnouncement('恢复顺序失败，请查看设置错误提示。'))
            setAnnouncement('已恢复默认顺序。')
          }}
        >
          <RotateCcw size={14} />
          恢复默认顺序
        </Button>
      </div>
      <div
        ref={listRef}
        className={styles.groups}
        onKeyDown={(event) => {
          if (event.key === 'Escape') endDrag(false)
        }}
      >
        {groups.map((group) => (
          <section key={group.key} className={styles.group} aria-label={group.label ?? '主导航'}>
            <h3 className={styles.groupTitle}>{group.label ?? '主导航'}</h3>
            <ol className={styles.list}>
              {group.entries.map((entry) => {
                const keys = group.entries.map((item) => item.key)
                const visible = isMenuEntryVisible(entry, settings.navigation.menuVisibility)
                const Icon = entry.icon
                return (
                  <li key={entry.key} className={styles.item}>
                    <div
                      className={styles.row}
                      data-motion-key={entry.key}
                      data-order-group={group.key}
                      data-order-key={entry.key}
                      data-dragging={(draft?.moved && draft.key === entry.key) || undefined}
                      data-drop={draft?.targetKey === entry.key ? draft.placement : undefined}
                    >
                      {handle(group.key, entry.key, entry.label, keys)}
                      <div className={styles.copy}>
                        <strong className={styles.label}>
                          <Icon size={16} />
                          {entry.label}
                        </strong>
                        <small className={styles.description}>
                          {'preference' in entry ? entry.preference.description : '始终显示设置入口。'}
                        </small>
                      </div>
                      <div className={styles.visibility}>
                        {entry.key === 'settings' ? (
                          <span className={styles.fixed}>始终显示</span>
                        ) : (
                          <Switch
                            aria-label={`显示${entry.label}`}
                            checked={visible}
                            disabled={Boolean(draft)}
                            onCheckedChange={(checked) => {
                              void updateSettings((current) => ({
                                ...current,
                                navigation: {
                                  ...current.navigation,
                                  menuVisibility: { ...current.navigation.menuVisibility, [entry.key]: checked },
                                },
                              })).catch(() => undefined)
                            }}
                          />
                        )}
                      </div>
                      {controls(group.key, entry.key, entry.label, keys)}
                    </div>
                    {'children' in entry && (
                      <ol className={styles.children} aria-label={`${entry.label}子菜单排序`}>
                        {entry.children.map((child) => {
                          const childKeys = entry.children.map((item) => item.key)
                          return (
                            <li
                              key={child.key}
                              className={styles.row}
                              data-motion-key={child.key}
                              data-order-group={entry.key}
                              data-order-key={child.key}
                              data-dragging={(draft?.moved && draft.key === child.key) || undefined}
                              data-drop={draft?.targetKey === child.key ? draft.placement : undefined}
                            >
                              {handle(entry.key, child.key, child.label, childKeys)}
                              <span className={styles.copy}>{child.label}</span>
                              {controls(entry.key, child.key, child.label, childKeys)}
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
      {draft?.moved &&
        createPortal(
          <div
            className={styles.ghost}
            aria-hidden='true'
            style={{
              width: draft.width,
              minHeight: draft.height,
              transform: `translate3d(${draft.x}px, ${draft.y}px, 0)`,
            }}
          >
            <GripVertical size={16} />
            <strong>{draft.label}</strong>
          </div>,
          document.body,
        )}
      <span className={styles.live} role='status' aria-live='polite'>
        {announcement}
      </span>
    </section>
  )
}
