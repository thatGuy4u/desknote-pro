import React from 'react'
import type { Note } from '@shared/types'
import { COLOR_MAP } from '@shared/colors'
import { useStore } from '../../store/useStore'

interface Props { note: Note; delay?: number }

export default function NoteCard({ note, delay = 0 }: Props) {
  const { openEditor, updateNote, removeNote } = useStore()
  const cfg = COLOR_MAP[note.color]

  const done  = note.checklist.filter(c => c.done).length
  const total = note.checklist.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  async function togglePin(e: React.MouseEvent) {
    e.stopPropagation()
    const patch = { pinned: !note.pinned }
    if (window.electronAPI) await window.electronAPI.notes.update(note.id, patch)
    updateNote(note.id, patch)
  }

  async function toggleFav(e: React.MouseEvent) {
    e.stopPropagation()
    const patch = { favorite: !note.favorite }
    if (window.electronAPI) await window.electronAPI.notes.update(note.id, patch)
    updateNote(note.id, patch)
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (window.electronAPI) await window.electronAPI.notes.delete(note.id)
    removeNote(note.id)
  }

  const modeLabel = note.desktopMode === 'always-on-top' ? '🔝' : note.desktopMode === 'desktop-layer' ? '🖥️' : null

  return (
    <div
      onClick={() => openEditor(note.id)}
      className="group relative flex flex-col rounded-2xl border border-transparent cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-xl"
      style={{
        background: cfg.bg,
        color: cfg.text,
        opacity: note.opacity / 100,
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Mode badge */}
      {modeLabel && (
        <span className="absolute top-2 right-2 text-xs bg-black/10 px-1.5 py-0.5 rounded font-mono">
          {modeLabel} {note.desktopMode === 'always-on-top' ? 'TOP' : 'DESK'}
        </span>
      )}

      {/* Header */}
      <div className="flex items-start gap-2 px-3.5 pt-3.5 pb-2">
        <h3 className="text-[13px] font-semibold flex-1 leading-snug pr-10 line-clamp-2">{note.title || 'Untitled'}</h3>
        <div className="flex gap-1 shrink-0 mt-0.5">
          {note.pinned    && <i className="ti ti-pin text-xs opacity-60" />}
          {note.favorite  && <i className="ti ti-heart text-xs opacity-60" />}
          {note.locked    && <i className="ti ti-lock text-xs opacity-60" />}
        </div>
      </div>

      {/* Body */}
      {note.type === 'text' && note.body && (
        <p className="px-3.5 pb-2 text-[11px] leading-relaxed opacity-75 line-clamp-4 whitespace-pre-line">
          {note.body}
        </p>
      )}

      {/* Checklist */}
      {note.type === 'checklist' && note.checklist.length > 0 && (
        <div className="px-3.5 pb-2">
          {note.checklist.slice(0, 5).map(item => (
            <div key={item.id} className={`flex items-center gap-1.5 py-0.5 text-[11px] ${item.done ? 'line-through opacity-50' : ''}`}>
              <div className={`w-3.5 h-3.5 rounded-sm border border-current/30 flex items-center justify-center shrink-0 text-[8px] ${item.done ? 'bg-current/20' : ''}`}>
                {item.done && '✓'}
              </div>
              {item.text}
            </div>
          ))}
          {note.checklist.length > 5 && (
            <p className="text-[10px] opacity-50 mt-1">+{note.checklist.length - 5} more</p>
          )}
          {/* Progress */}
          <div className="mt-2">
            <div className="flex justify-between text-[9px] opacity-50 mb-1">
              <span>{done}/{total} done</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1 rounded-full bg-black/10">
              <div className="h-full rounded-full bg-black/30 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-3.5 py-2 mt-auto border-t border-black/10">
        <span className="text-[10px] opacity-50 font-mono">
          {new Date(note.updatedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
        </span>

        {/* Hover actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={togglePin}
            title={note.pinned ? 'Unpin' : 'Pin'}
            className="w-5 h-5 rounded bg-black/10 hover:bg-black/20 border-none cursor-pointer flex items-center justify-center text-[10px] text-current"
          >
            <i className={`ti ${note.pinned ? 'ti-pin-filled' : 'ti-pin'}`} />
          </button>
          <button
            onClick={toggleFav}
            title={note.favorite ? 'Unfavorite' : 'Favorite'}
            className="w-5 h-5 rounded bg-black/10 hover:bg-black/20 border-none cursor-pointer flex items-center justify-center text-[10px] text-current"
          >
            <i className={`ti ${note.favorite ? 'ti-heart-filled' : 'ti-heart'}`} />
          </button>
          <button
            onClick={handleDelete}
            title="Delete"
            className="w-5 h-5 rounded bg-black/10 hover:bg-red-500/40 border-none cursor-pointer flex items-center justify-center text-[10px] text-current"
          >
            <i className="ti ti-trash" />
          </button>
        </div>
      </div>
    </div>
  )
}
