import { Columns3, Eye, FileText, Pencil, Pin, PinOff, Plus, Save, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import { Button, Input, ListState, PageHeader, Textarea } from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { openExternalURL } from '@/shared/native-kit'

import {
  deleteQuickNote,
  listQuickNotes,
  saveQuickNote,
  type QuickNote,
  type QuickNoteInput,
} from '../api/quickNotesApi'
import { MarkdownPreview } from './MarkdownPreview'

import { styles } from './QuickNotesPanel.css'

const cx = createScopedClassNames(styles)

type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'
type NoteViewMode = 'preview' | 'edit' | 'split'

function noteFingerprint(note: QuickNoteInput): string {
  return JSON.stringify([note.title, note.content, note.pinned])
}

function sortNotes(notes: QuickNote[]): QuickNote[] {
  return [...notes].sort((left, right) => {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1
    if (left.updatedAt !== right.updatedAt) return right.updatedAt.localeCompare(left.updatedAt)
    return right.id - left.id
  })
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间未知'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export function QuickNotesPanel() {
  const { notify, confirm } = useFeedback()
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [draft, setDraft] = useState<QuickNote | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [viewMode, setViewMode] = useState<NoteViewMode>('preview')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [loadError, setLoadError] = useState('')
  const draftRef = useRef<QuickNote | null>(null)
  const selectedIDRef = useRef<number | null>(null)
  const savedFingerprints = useRef(new Map<number, string>())

  const filteredNotes = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase()
    if (!keyword) return notes
    return notes.filter((note) => `${note.title}\n${note.content}`.toLocaleLowerCase().includes(keyword))
  }, [notes, search])

  function activateNote(note: QuickNote | null, nextViewMode: NoteViewMode = 'preview') {
    selectedIDRef.current = note?.id ?? null
    draftRef.current = note
    setDraft(note)
    setViewMode(nextViewMode)
    setSaveStatus('saved')
  }

  async function persistNote(note: QuickNote) {
    const fingerprint = noteFingerprint(note)
    if (savedFingerprints.current.get(note.id) === fingerprint) return

    if (selectedIDRef.current === note.id) {
      setSaveStatus('saving')
    }
    try {
      const saved = await saveQuickNote(note)
      savedFingerprints.current.set(saved.id, noteFingerprint(saved))
      setNotes((current) => sortNotes([...current.filter((item) => item.id !== saved.id), saved]))

      const currentDraft = draftRef.current
      if (currentDraft?.id === saved.id && noteFingerprint(currentDraft) === fingerprint) {
        draftRef.current = saved
        setDraft(saved)
        setSaveStatus('saved')
      } else if (selectedIDRef.current === saved.id) {
        setSaveStatus('pending')
      }
    } catch (error) {
      if (selectedIDRef.current === note.id) {
        setSaveStatus('error')
      }
      notify({ title: '笔记保存失败', message: errorMessage(error, '请稍后重试。'), tone: 'error' })
    }
  }

  function selectNote(note: QuickNote) {
    const current = draftRef.current
    if (current && savedFingerprints.current.get(current.id) !== noteFingerprint(current)) {
      void persistNote(current)
    }
    activateNote(note)
  }

  function updateDraft(patch: Partial<QuickNote>) {
    const current = draftRef.current
    if (!current) return
    const next = { ...current, ...patch }
    draftRef.current = next
    setDraft(next)
    setSaveStatus('pending')
  }

  async function createNote() {
    if (creating) return
    const current = draftRef.current
    if (current && savedFingerprints.current.get(current.id) !== noteFingerprint(current)) {
      void persistNote(current)
    }

    setCreating(true)
    try {
      const created = await saveQuickNote({ id: 0, title: '', content: '', pinned: false })
      savedFingerprints.current.set(created.id, noteFingerprint(created))
      setNotes((items) => sortNotes([...items, created]))
      activateNote(created, 'edit')
    } catch (error) {
      notify({ title: '新建笔记失败', message: errorMessage(error, '请稍后重试。'), tone: 'error' })
    } finally {
      setCreating(false)
    }
  }

  async function removeNote() {
    const current = draftRef.current
    if (!current) return
    const accepted = await confirm({
      title: '删除笔记',
      message: `确定删除「${current.title || '未命名笔记'}」吗？此操作无法撤销。`,
      confirmLabel: '删除',
      tone: 'danger',
    })
    if (!accepted) return

    try {
      await deleteQuickNote(current.id)
      savedFingerprints.current.delete(current.id)
      const remaining = notes.filter((note) => note.id !== current.id)
      setNotes(remaining)
      activateNote(remaining[0] ?? null)
      notify({ title: '笔记已删除', tone: 'success' })
    } catch (error) {
      notify({ title: '删除失败', message: errorMessage(error, '请稍后重试。'), tone: 'error' })
    }
  }

  function handleShortcut(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.metaKey || event.ctrlKey)) return
    if (event.key.toLocaleLowerCase() === 's' && draftRef.current) {
      event.preventDefault()
      void persistNote(draftRef.current)
    }
    if (event.key.toLocaleLowerCase() === 'n') {
      event.preventDefault()
      void createNote()
    }
  }

  async function openLink(url: string) {
    try {
      await openExternalURL(url)
    } catch (error) {
      notify({ title: '链接打开失败', message: errorMessage(error, '请稍后重试。'), tone: 'error' })
    }
  }

  useEffect(() => {
    let active = true
    void listQuickNotes()
      .then((items) => {
        if (!active) return
        const sorted = sortNotes(items)
        savedFingerprints.current = new Map(sorted.map((note) => [note.id, noteFingerprint(note)]))
        setNotes(sorted)
        activateNote(sorted[0] ?? null)
        setLoadError('')
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoadError(errorMessage(error, '快速笔记加载失败。'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!draft || savedFingerprints.current.get(draft.id) === noteFingerprint(draft)) return
    const timer = window.setTimeout(() => void persistNote(draft), 700)
    return () => window.clearTimeout(timer)
  }, [draft])

  useEffect(
    () => () => {
      const current = draftRef.current
      if (current && savedFingerprints.current.get(current.id) !== noteFingerprint(current)) {
        void saveQuickNote(current)
      }
    },
    [],
  )

  const saveStatusText = {
    saved: '已保存',
    pending: '等待自动保存…',
    saving: '正在保存…',
    error: '保存失败',
  }[saveStatus]

  return (
    <div className={cx('quick-notes-page')} onKeyDown={handleShortcut}>
      <PageHeader
        eyebrow='Cloud workspace'
        title='快速笔记'
        subtitle='随手记录内容，自动保存到云端账号。'
        actions={
          <Button disabled={creating} onClick={() => void createNote()}>
            <Plus aria-hidden='true' />
            {creating ? '正在新建…' : '新建笔记'}
          </Button>
        }
      />

      <section className={cx('quick-notes-workspace')}>
        <aside className={cx('quick-notes-list-panel')}>
          <div className={cx('quick-notes-search')}>
            <Search className={cx('quick-notes-search-icon')} aria-hidden='true' />
            <Input
              className={cx('quick-notes-search-input')}
              aria-label='搜索笔记'
              value={search}
              placeholder='搜索标题或内容'
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className={cx('quick-notes-list-meta')}>
            <span className={cx('quick-notes-list-meta-text')}>
              {search.trim() ? `${filteredNotes.length} 条匹配` : `${notes.length} 条笔记`}
            </span>
            <small className={cx('quick-notes-list-meta-shortcut')}>⌘/Ctrl + N 新建</small>
          </div>

          <div className={cx('quick-notes-list')}>
            {filteredNotes.map((note) => (
              <Button
                key={note.id}
                className={cx(
                  `quick-notes-list-item${draft?.id === note.id ? ' is-active' : ''}${note.pinned ? ' is-pinned' : ''}`,
                )}
                size='lg'
                variant='ghost'
                title={note.title}
                aria-current={draft?.id === note.id ? 'page' : undefined}
                onClick={() => selectNote(note)}
              >
                {note.pinned ? (
                  <Pin className={cx('quick-notes-list-item-icon')} aria-hidden='true' />
                ) : (
                  <FileText className={cx('quick-notes-list-item-icon')} aria-hidden='true' />
                )}
                <strong className={cx('quick-notes-list-item-title')}>{note.title || '未命名笔记'}</strong>
                <span className={cx('quick-notes-list-item-time')}>{formatUpdatedAt(note.updatedAt)}</span>
              </Button>
            ))}
            {!filteredNotes.length && (
              <ListState
                className={cx('quick-notes-empty-list')}
                loading={loading}
                loadingText='正在读取笔记…'
                emptyText={loadError || (search.trim() ? '没有匹配的笔记' : '还没有笔记，点击右上角新建')}
                icon={<FileText aria-hidden='true' />}
              />
            )}
          </div>
        </aside>

        <main className={cx('quick-notes-editor-panel')}>
          {draft ? (
            <>
              <header className={cx('quick-notes-editor-header')}>
                {viewMode === 'preview' ? (
                  <h2 className={cx('quick-notes-title')}>{draft.title || '未命名笔记'}</h2>
                ) : (
                  <Input
                    className={cx('quick-notes-title-input')}
                    aria-label='笔记标题'
                    maxLength={120}
                    value={draft.title}
                    placeholder='笔记标题'
                    onChange={(event) => updateDraft({ title: event.target.value })}
                  />
                )}
                <div className={cx('quick-notes-editor-actions')}>
                  <span className={cx(`quick-notes-save-status is-${saveStatus}`)} aria-live='polite'>
                    {saveStatusText}
                  </span>
                  <div className={cx('quick-notes-mode-switch')} role='group' aria-label='笔记显示模式'>
                    <Button
                      className={cx('quick-notes-mode-button')}
                      size='sm'
                      variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                      aria-pressed={viewMode === 'preview'}
                      aria-label='预览笔记'
                      title='预览笔记'
                      onClick={() => setViewMode('preview')}
                    >
                      <Eye aria-hidden='true' />
                    </Button>
                    <Button
                      className={cx('quick-notes-mode-button')}
                      size='sm'
                      variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
                      aria-pressed={viewMode === 'edit'}
                      aria-label='编辑笔记'
                      title='编辑笔记'
                      onClick={() => setViewMode('edit')}
                    >
                      <Pencil aria-hidden='true' />
                    </Button>
                    <Button
                      className={cx('quick-notes-mode-button')}
                      size='sm'
                      variant={viewMode === 'split' ? 'secondary' : 'ghost'}
                      aria-pressed={viewMode === 'split'}
                      aria-label='分栏实时预览'
                      title='分栏实时预览'
                      onClick={() => setViewMode('split')}
                    >
                      <Columns3 aria-hidden='true' />
                    </Button>
                  </div>
                  <Button
                    size='sm'
                    variant='ghost'
                    title={draft.pinned ? '取消置顶' : '置顶笔记'}
                    aria-label={draft.pinned ? '取消置顶' : '置顶笔记'}
                    aria-pressed={draft.pinned}
                    onClick={() => updateDraft({ pinned: !draft.pinned })}
                  >
                    {draft.pinned ? <PinOff aria-hidden='true' /> : <Pin aria-hidden='true' />}
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    title='立即保存'
                    aria-label='立即保存'
                    disabled={saveStatus === 'saving'}
                    onClick={() => void persistNote(draft)}
                  >
                    <Save aria-hidden='true' />
                  </Button>
                  <Button size='sm' variant='ghost' title='删除笔记' aria-label='删除笔记' onClick={removeNote}>
                    <Trash2 aria-hidden='true' />
                  </Button>
                </div>
              </header>
              {viewMode === 'preview' && <MarkdownPreview content={draft.content} onOpenLink={openLink} />}
              {viewMode === 'edit' && (
                <Textarea
                  className={cx('quick-notes-content')}
                  aria-label='笔记内容'
                  maxLength={100000}
                  value={draft.content}
                  placeholder='开始记录…支持 Markdown 语法'
                  spellCheck
                  onChange={(event) => updateDraft({ content: event.target.value })}
                />
              )}
              {viewMode === 'split' && (
                <div className={cx('quick-notes-split-view')}>
                  <Textarea
                    className={cx('quick-notes-content', 'quick-notes-split-editor')}
                    aria-label='笔记内容编辑器'
                    maxLength={100000}
                    value={draft.content}
                    placeholder='开始记录…支持 Markdown 语法'
                    spellCheck
                    onChange={(event) => updateDraft({ content: event.target.value })}
                  />
                  <MarkdownPreview
                    className={cx('quick-notes-split-preview')}
                    content={draft.content}
                    onOpenLink={openLink}
                  />
                </div>
              )}
              <footer className={cx('quick-notes-editor-footer')}>
                <span className={cx('quick-notes-editor-footer-item')}>
                  {draft.content.length.toLocaleString('zh-CN')} 字符
                </span>
                <span className={cx('quick-notes-editor-footer-item')}>更新于 {formatUpdatedAt(draft.updatedAt)}</span>
              </footer>
            </>
          ) : (
            <ListState
              className={cx('quick-notes-empty-editor')}
              loading={loading}
              loadingText='正在准备编辑器…'
              emptyText={loadError || '选择一条笔记，或新建笔记开始记录'}
              icon={<FileText aria-hidden='true' />}
            />
          )}
        </main>
      </section>
    </div>
  )
}
