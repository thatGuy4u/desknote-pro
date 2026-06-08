import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import ReactDOM from 'react-dom/client'
import './styles/globals.css'
import { COLOR_MAP } from '@shared/colors'
import { decodeNoteSnapshot } from '@shared/noteSnapshot'
import type { Note, ChecklistItem } from '@shared/types'

function readSnapFromUrl(): string | null {
  const fromQuery = new URLSearchParams(window.location.search).get('snap')
  if (fromQuery) return fromQuery
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null
  return new URLSearchParams(hash).get('snap')
}

function readInitialNote(noteId: string | null): Note | null {
  if (!noteId) return null

  const cached = window.electronAPI?.notes.getCached?.(noteId)
  if (cached) return cached

  const snap = readSnapFromUrl()
  if (snap) {
    const decoded = decodeNoteSnapshot(snap)
    if (decoded) return decoded
  }

  return null
}

// ─── FloatingNote ─────────────────────────────────────────────────────────────

function FloatingNote() {
  const params  = new URLSearchParams(window.location.search)
  const noteId  = params.get('id')
  const isQuick = params.get('quickCapture') === '1'
  const initial = useMemo(() => readInitialNote(noteId), [noteId])

  const [note, setNote]     = useState<Note | null>(initial)
  const [title, setTitle]   = useState(initial?.title ?? '')
  const [body, setBody]     = useState(initial?.body ?? '')
  const [editing, setEditing] = useState(isQuick)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isQuick && !!noteId && !initial)
  const editingRef = useRef(editing)

  editingRef.current = editing

  const applyNote = useCallback((found: Note, keepEditing = false) => {
    setNote(found)
    if (!keepEditing && !editingRef.current) {
      setTitle(found.title)
      setBody(found.body)
    }
  }, [])

  useEffect(() => {
    if (!noteId || isQuick) {
      setLoading(false)
      return
    }

    const onPosition = (pos: unknown) => {
      const { x, y } = pos as { x: number; y: number }
      window.electronAPI?.notes.update(noteId, { position: { x, y } })
    }

    const onSize = (size: unknown) => {
      const { width, height } = size as { width: number; height: number }
      window.electronAPI?.notes.update(noteId, { size: { width, height } })
    }

    const onUpdated = (updated: unknown) => {
      const n = updated as Note
      if (n.id === noteId) applyNote(n, editingRef.current)
    }

    window.electronAPI?.on('note:positionChanged', onPosition)
    window.electronAPI?.on('note:sizeChanged', onSize)
    window.electronAPI?.on('note:updated', onUpdated)

    async function hydrate() {
      if (!window.electronAPI) {
        setLoading(false)
        return
      }

      if (!initial) setLoading(true)

      const bootstrap = await window.electronAPI.notes.getBootstrap(noteId)
      if (bootstrap) {
        applyNote(bootstrap)
        setLoading(false)
        return
      }

      for (let i = 0; i < 6; i++) {
        const found = await window.electronAPI.notes.get(noteId)
        if (found) {
          applyNote(found)
          setLoading(false)
          return
        }
        await new Promise(r => setTimeout(r, 100 * (i + 1)))
      }

      setLoading(false)
    }

    if (!initial) hydrate()

    return () => {
      window.electronAPI?.off('note:positionChanged', onPosition)
      window.electronAPI?.off('note:sizeChanged', onSize)
      window.electronAPI?.off('note:updated', onUpdated)
    }
  }, [noteId, isQuick, initial, applyNote])

  async function save() {
    setSaving(true)
    try {
      if (isQuick) {
        const data = {
          title: title || 'Quick Note', body,
          color: 'yellow' as const, type: 'text' as const,
          checklist: [], pinned: false, favorite: false,
          locked: false, archived: false, opacity: 100,
          desktopMode: 'always-on-top' as const,
          position: { x: 100, y: 100 },
          size: { width: 280, height: 200 },
        }
        if (window.electronAPI) {
          await window.electronAPI.notes.create(data)
          window.close()
        }
        return
      }

      if (noteId && window.electronAPI) {
        const updated = await window.electronAPI.notes.update(noteId, { title, body })
        if (updated) applyNote(updated)
      }
    } finally {
      setEditing(false)
      setSaving(false)
    }
  }

  function toggleCheck(id: string) {
    if (!note) return
    const updated = note.checklist.map((c: ChecklistItem) =>
      c.id === id ? { ...c, done: !c.done } : c
    )
    setNote({ ...note, checklist: updated })
    window.electronAPI?.notes.update(note.id, { checklist: updated })
  }

  const noteColor = note?.color ?? initial?.color ?? 'yellow'
  const cfg = COLOR_MAP[noteColor] ?? COLOR_MAP['yellow']
  const done = note?.checklist.filter(c => c.done).length ?? 0
  const tot  = note?.checklist.length ?? 0
  const displayTitle = title || note?.title || initial?.title || ''
  const displayBody = body || note?.body || initial?.body || ''
  const noteType = note?.type ?? initial?.type ?? 'text'
  const desktopMode = note?.desktopMode ?? initial?.desktopMode

  const modeLabel =
    desktopMode === 'always-on-top' ? '🔝 TOP' :
    desktopMode === 'desktop-layer' ? '🖥️ DESK' : ''

  if (loading) {
    return (
      <div
        className="w-full h-full rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl"
        style={{ background: cfg.bg, color: cfg.text }}
      >
        <span className="text-xs opacity-50">Loading…</span>
      </div>
    )
  }

  return (
    <div
      className="w-full h-full rounded-2xl flex flex-col overflow-hidden border border-white/10 shadow-2xl"
      style={{ background: cfg.bg, color: cfg.text, opacity: (note?.opacity ?? initial?.opacity ?? 100) / 100 }}
    >
      <div
        className="drag-region flex items-center gap-2 px-3 py-2 border-b border-black/10 shrink-0"
        style={{ background: 'rgba(0,0,0,0.08)' }}
      >
        <div className="flex gap-1 no-drag">
          <button
            onClick={() => {
              if (noteId && window.electronAPI) window.electronAPI.window.closeNote(noteId)
              else window.close()
            }}
            className="w-3 h-3 rounded-full bg-red-500 border-none cursor-pointer hover:opacity-80"
            title="Close"
          />
          <button className="w-3 h-3 rounded-full bg-yellow-400 border-none cursor-pointer hover:opacity-80" title="Minimize" />
          <button className="w-3 h-3 rounded-full bg-green-400 border-none cursor-pointer hover:opacity-80 text-[6px] text-black flex items-center justify-center" title="Expand">⤢</button>
        </div>
        <span className="text-[10px] font-mono opacity-60 flex-1 text-center truncate">{modeLabel}</span>
        {!isQuick && (
          <button
            onClick={() => setEditing(e => !e)}
            className="no-drag w-5 h-5 rounded bg-black/10 border-none cursor-pointer flex items-center justify-center text-[10px] hover:bg-black/20 transition-colors"
          >
            <i className={`ti ${editing ? 'ti-eye' : 'ti-edit'}`} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {editing ? (
          <>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title…"
              autoFocus
              className="w-full bg-transparent border-none outline-none font-semibold text-sm mb-2 placeholder:opacity-40"
              style={{ color: cfg.text }}
            />
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your note…"
              className="w-full flex-1 bg-transparent border-none outline-none text-xs leading-relaxed resize-none placeholder:opacity-40"
              style={{ color: cfg.text, height: 'calc(100% - 40px)' }}
            />
          </>
        ) : (
          <>
            {displayTitle ? (
              <h3 className="font-semibold text-sm mb-2 leading-snug">{displayTitle}</h3>
            ) : null}
            {noteType === 'text' && displayBody ? (
              <p className="text-xs leading-relaxed opacity-80 whitespace-pre-line">{displayBody}</p>
            ) : null}
            {noteType === 'checklist' && (note ?? initial) ? (
              <div>
                {(note ?? initial)!.checklist.map((c: ChecklistItem) => (
                  <div
                    key={c.id}
                    onClick={() => toggleCheck(c.id)}
                    className="flex items-center gap-1.5 py-0.5 cursor-pointer text-xs"
                  >
                    <div className={`w-3.5 h-3.5 rounded-sm border border-current/30 flex items-center justify-center text-[8px] shrink-0 ${c.done ? 'bg-current/20' : ''}`}>
                      {c.done && '✓'}
                    </div>
                    <span className={c.done ? 'line-through opacity-50' : ''}>{c.text}</span>
                  </div>
                ))}
                {tot > 0 && (
                  <div className="mt-2">
                    <div className="text-[9px] opacity-50 mb-1">{done}/{tot} · {Math.round(done / tot * 100)}%</div>
                    <div className="h-1 rounded-full bg-black/10">
                      <div className="h-full rounded-full bg-black/30" style={{ width: `${Math.round(done / tot * 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            {isQuick && !displayTitle && !displayBody && (
              <p className="text-xs opacity-50 mt-2">Start writing your quick note…</p>
            )}
          </>
        )}
      </div>

      {editing && (
        <div className="flex gap-2 px-3 py-2 border-t border-black/10 shrink-0 no-drag">
          <button
            onClick={() => {
              setEditing(false)
              setTitle(note?.title ?? initial?.title ?? '')
              setBody(note?.body ?? initial?.body ?? '')
            }}
            className="flex-1 py-1 rounded-lg text-[11px] bg-black/10 hover:bg-black/20 border-none cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-1 rounded-lg text-[11px] bg-black/20 hover:bg-black/30 border-none cursor-pointer font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? '…' : isQuick ? 'Create' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('note-root')!).render(<FloatingNote />)
