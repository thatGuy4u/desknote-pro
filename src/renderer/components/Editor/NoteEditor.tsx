import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { NOTE_COLORS, COLOR_MAP } from '@shared/colors'
import type { Note, NoteColor, DesktopMode, ChecklistItem } from '@shared/types'
import { v4 as uuid } from 'uuid'

const DESKTOP_MODES: { value: DesktopMode; label: string; icon: string; desc: string }[] = [
  { value: 'normal',        label: 'Normal',      icon: 'ti-layout-sidebar', desc: 'Regular window' },
  { value: 'always-on-top', label: 'Always Top',  icon: 'ti-arrow-up',       desc: 'Floats above windows' },
  { value: 'desktop-layer', label: 'Desktop',     icon: 'ti-device-desktop', desc: 'Pinned to wallpaper' },
]

export default function NoteEditor() {
  const { notes, editingNoteId, editorOpen, closeEditor, addNote, updateNote, removeNote } = useStore()
  const existingNote = editingNoteId ? notes.find(n => n.id === editingNoteId) : null

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [color, setColor] = useState<NoteColor>('yellow')
  const [opacity, setOpacity] = useState(100)
  const [desktopMode, setDesktopMode] = useState<DesktopMode>('normal')
  const [favorite, setFavorite] = useState(false)
  const [locked, setLocked] = useState(false)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [noteType, setNoteType] = useState<'text' | 'checklist'>('text')
  const [newCheckItem, setNewCheckItem] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  // Load note data into editor when opened
  useEffect(() => {
    if (editorOpen) {
      if (existingNote) {
        setTitle(existingNote.title)
        setBody(existingNote.body)
        setColor(existingNote.color)
        setOpacity(existingNote.opacity)
        setDesktopMode(existingNote.desktopMode)
        setFavorite(existingNote.favorite)
        setLocked(existingNote.locked)
        setChecklist(existingNote.checklist)
        setNoteType(existingNote.type)
      } else {
        // New note defaults
        const s = useStore.getState().settings
        setTitle('')
        setBody('')
        setColor(s?.defaultColor ?? 'yellow')
        setOpacity(s?.defaultOpacity ?? 100)
        setDesktopMode(s?.defaultDesktopMode ?? 'normal')
        setFavorite(false)
        setLocked(false)
        setChecklist([])
        setNoteType('text')
        setTimeout(() => titleRef.current?.focus(), 100)
      }
    }
  }, [editorOpen, editingNoteId])

  async function save() {
    const now = new Date().toISOString()
    const base = useStore.getState().settings
    const noteData = {
      title: title || 'Untitled',
      body, color, type: noteType, checklist,
      pinned: existingNote?.pinned ?? false,
      favorite, locked, archived: false,
      opacity, desktopMode,
      position: existingNote?.position ?? { x: 100, y: 100 },
      size: existingNote?.size ?? { width: 280, height: 200 },
    }

    if (existingNote) {
      const updated = { ...noteData, updatedAt: now }
      if (window.electronAPI) await window.electronAPI.notes.update(existingNote.id, updated)
      updateNote(existingNote.id, updated)
      // Update floating window if mode changed
      if (window.electronAPI && desktopMode !== existingNote.desktopMode) {
        await window.electronAPI.window.setMode(existingNote.id, desktopMode)
      }
    } else {
      if (window.electronAPI) {
        const created = await window.electronAPI.notes.create(noteData)
        addNote(created)
      } else {
        const created: Note = { ...noteData, id: uuid(), createdAt: now, updatedAt: now }
        addNote(created)
      }
    }
    closeEditor()
  }

  async function handleDelete() {
    if (!existingNote) return closeEditor()
    if (window.electronAPI) await window.electronAPI.notes.delete(existingNote.id)
    removeNote(existingNote.id)
    closeEditor()
  }

  async function handleDuplicate() {
    if (!existingNote) return
    if (window.electronAPI) {
      const duped = await window.electronAPI.notes.duplicate(existingNote.id)
      addNote(duped)
    }
    closeEditor()
  }

  async function handleArchive() {
    if (!existingNote) return
    const patch = { archived: true }
    if (window.electronAPI) await window.electronAPI.notes.update(existingNote.id, patch)
    updateNote(existingNote.id, patch)
    closeEditor()
  }

  async function openOnDesktop() {
    if (!existingNote) return
    if (window.electronAPI) await window.electronAPI.window.newNote(existingNote.id)
  }

  function addCheckItem() {
    if (!newCheckItem.trim()) return
    setChecklist(prev => [...prev, { id: uuid(), text: newCheckItem.trim(), done: false }])
    setNewCheckItem('')
  }

  function toggleCheckItem(id: string) {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c))
  }

  function removeCheckItem(id: string) {
    setChecklist(prev => prev.filter(c => c.id !== id))
  }

  const cfg = COLOR_MAP[color]

  if (!editorOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 z-10" onClick={closeEditor} />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-[340px] bg-[var(--bg-2)] border-l border-[var(--border)] flex flex-col z-20 anim-slide-in shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] shrink-0">
          <button onClick={closeEditor} className="w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--border)] cursor-pointer flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-all">
            <i className="ti ti-x text-sm" />
          </button>
          <span className="text-sm font-semibold flex-1 text-[var(--text-1)]">
            {existingNote ? 'Edit Note' : 'New Note'}
          </span>
          <button onClick={handleDuplicate} title="Duplicate" className="w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--border)] cursor-pointer flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] transition-all">
            <i className="ti ti-copy text-sm" />
          </button>
          <button onClick={() => setFavorite(f => !f)} title="Favorite" className={`w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--border)] cursor-pointer flex items-center justify-center transition-all ${favorite ? 'text-red-400' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
            <i className={`ti ${favorite ? 'ti-heart-filled' : 'ti-heart'} text-sm`} />
          </button>
          {existingNote && (
            <button onClick={openOnDesktop} title="Open on Desktop" className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 cursor-pointer flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-all">
              <i className="ti ti-external-link text-sm" />
            </button>
          )}
        </div>

        {/* Color palette */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] shrink-0 flex-wrap">
          {NOTE_COLORS.map(c => (
            <button
              key={c.name}
              onClick={() => setColor(c.name)}
              title={c.label}
              className={`w-5 h-5 rounded-full cursor-pointer border-2 transition-transform hover:scale-110 ${color === c.name ? 'border-[var(--text-1)] scale-110' : 'border-transparent'}`}
              style={{ background: c.hex }}
            />
          ))}
        </div>

        {/* Note type toggle */}
        <div className="flex gap-1 px-4 py-2.5 border-b border-[var(--border)] shrink-0">
          <button
            onClick={() => setNoteType('text')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all ${noteType === 'text' ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'bg-transparent border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-2)]'}`}
          >
            <i className="ti ti-text-size" /> Text
          </button>
          <button
            onClick={() => setNoteType('checklist')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all ${noteType === 'checklist' ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'bg-transparent border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-2)]'}`}
          >
            <i className="ti ti-list-check" /> Checklist
          </button>
        </div>

        {/* Editor body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {/* Title */}
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Note title…"
              className="w-full bg-transparent border-none outline-none text-[var(--text-1)] font-semibold text-base placeholder:text-[var(--text-3)] mb-3"
            />

            {/* Preview swatch */}
            <div className="rounded-xl p-3 mb-3 text-xs" style={{ background: cfg.bg, color: cfg.text }}>
              <div className="font-semibold text-sm mb-1">{title || 'Preview'}</div>
              <div className="opacity-70">This is how your note will appear</div>
            </div>

            {/* Text body */}
            {noteType === 'text' && (
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Start writing your note…"
                className="w-full h-36 bg-[var(--bg-3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none resize-none leading-relaxed focus:border-[var(--accent)] transition-colors"
              />
            )}

            {/* Checklist */}
            {noteType === 'checklist' && (
              <div className="space-y-1">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-2 group p-2 rounded-lg hover:bg-[var(--surface)] transition-colors">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleCheckItem(item.id)}
                      className="shrink-0"
                    />
                    <span className={`flex-1 text-sm text-[var(--text-1)] ${item.done ? 'line-through opacity-50' : ''}`}>
                      {item.text}
                    </span>
                    <button
                      onClick={() => removeCheckItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded bg-[var(--surface-2)] border-none cursor-pointer flex items-center justify-center text-[var(--text-3)] hover:text-red-400 transition-all"
                    >
                      <i className="ti ti-x text-xs" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <input
                    value={newCheckItem}
                    onChange={e => setNewCheckItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCheckItem()}
                    placeholder="Add item… (Enter)"
                    className="flex-1 bg-[var(--bg-3)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
                  />
                  <button
                    onClick={addCheckItem}
                    className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm border-none cursor-pointer hover:opacity-90"
                  >
                    <i className="ti ti-plus" />
                  </button>
                </div>
                {checklist.length > 0 && (
                  <div className="text-[10px] text-[var(--text-3)] mt-1">
                    {checklist.filter(c => c.done).length}/{checklist.length} completed
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Opacity */}
          <div className="px-4 py-3 border-t border-[var(--border)]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-[var(--text-2)] flex items-center gap-1.5">
                <i className="ti ti-adjustments-horizontal" /> Opacity
              </span>
              <span className="text-xs font-mono text-[var(--accent)]">{opacity}%</span>
            </div>
            <input
              type="range" min={20} max={100} step={10}
              value={opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[9px] text-[var(--text-3)] mt-1">
              <span>20%</span><span>60%</span><span>100%</span>
            </div>
          </div>

          {/* Desktop mode */}
          <div className="px-4 py-3 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-2)] mb-2 flex items-center gap-1.5">
              <i className="ti ti-stack" /> Desktop Layer Mode
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {DESKTOP_MODES.map(m => (
                <button
                  key={m.value}
                  onClick={() => setDesktopMode(m.value)}
                  title={m.desc}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] border cursor-pointer transition-all ${desktopMode === m.value ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'bg-transparent border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-2)]'}`}
                >
                  <i className={`ti ${m.icon} text-base`} />
                  {m.label}
                </button>
              ))}
            </div>
            {desktopMode !== 'normal' && (
              <p className="text-[10px] text-[var(--accent)] mt-2 flex items-center gap-1">
                <i className="ti ti-info-circle" />
                {desktopMode === 'always-on-top'
                  ? 'Note will float above all windows on all workspaces'
                  : 'Note will be attached to the desktop wallpaper layer'}
              </p>
            )}
          </div>

          {/* Lock */}
          <div className="px-4 py-3 border-t border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--text-1)]">Lock Note</p>
                <p className="text-[10px] text-[var(--text-3)]">Encrypt with local PIN</p>
              </div>
              <button
                onClick={() => setLocked(l => !l)}
                className={`w-9 h-5 rounded-full relative transition-all border-none cursor-pointer ${locked ? 'bg-[var(--accent)]' : 'bg-[var(--bg-4)]'}`}
              >
                <span className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${locked ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 px-4 py-3 border-t border-[var(--border)] shrink-0">
          {existingNote && (
            <button
              onClick={handleArchive}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--text-2)] cursor-pointer hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-all"
            >
              <i className="ti ti-archive" /> Archive
            </button>
          )}
          {existingNote && (
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400 cursor-pointer hover:bg-red-500/20 transition-all"
            >
              <i className="ti ti-trash" />
            </button>
          )}
          <button
            onClick={save}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md shadow-[var(--accent)]/30"
          >
            <i className="ti ti-check" /> {existingNote ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </>
  )
}
