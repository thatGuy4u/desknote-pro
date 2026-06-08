import React, { useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { COLOR_MAP } from '@shared/colors'
import type { Note } from '@shared/types'

export default function DesktopView() {
  const { notes, updateNote, openEditor } = useStore()
  const pinned = notes.filter(n => n.desktopMode !== 'normal' && !n.archived)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  function startDrag(e: React.MouseEvent, note: Note) {
    e.preventDefault()
    setDragging(note.id)
    setDragOffset({ x: e.clientX - note.position.x, y: e.clientY - note.position.y })
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    const newX = Math.max(0, e.clientX - dragOffset.x)
    const newY = Math.max(0, e.clientY - dragOffset.y)
    updateNote(dragging, { position: { x: newX, y: newY } })
  }

  async function endDrag() {
    if (!dragging) return
    const note = notes.find(n => n.id === dragging)
    if (note && window.electronAPI) {
      await window.electronAPI.notes.update(note.id, { position: note.position })
    }
    setDragging(null)
  }

  async function openOnDesktop(note: Note) {
    if (window.electronAPI) await window.electronAPI.window.newNote(note.id)
  }

  const modeColor = (mode: string) =>
    mode === 'always-on-top' ? '#3b82f6' : mode === 'desktop-layer' ? '#34d399' : '#94a3b8'

  const modeLabel = (mode: string) =>
    mode === 'always-on-top' ? '🔝 Always on Top' : mode === 'desktop-layer' ? '🖥️ Desktop Layer' : 'Normal'

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-[var(--border)] bg-[var(--bg-2)] shrink-0">
        <span className="text-base font-semibold">Desktop Layer</span>
        <span className="text-xs text-[var(--text-3)]">{pinned.length} pinned notes</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-mono bg-[var(--bg-3)] border border-[var(--border)] px-2.5 py-1 rounded-lg text-[var(--text-2)]">
            <span className="text-green-400">●</span> visibleOnAllWorkspaces: ON
          </span>
          <span className="text-[10px] font-mono bg-[var(--bg-3)] border border-[var(--border)] px-2.5 py-1 rounded-lg text-[var(--text-2)]">
            <span className="text-[var(--accent)]">●</span> alwaysOnTop: ON
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 px-5 py-2 border-b border-[var(--border)] bg-[var(--bg-2)] shrink-0">
        {[
          { label: 'Always on Top', color: '#3b82f6', desc: 'Floats above all windows' },
          { label: 'Desktop Layer', color: '#34d399', desc: 'Attached to wallpaper' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-[11px] text-[var(--text-2)]">
            <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
            <span className="font-medium" style={{ color: l.color }}>{l.label}</span>
            <span className="text-[var(--text-3)]">— {l.desc}</span>
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 39px, var(--border) 39px, var(--border) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, var(--border) 39px, var(--border) 40px)',
        }}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        {/* Wallpaper hint */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-[var(--text-3)] text-center opacity-30">
            <i className="ti ti-device-desktop text-6xl block mb-2" />
            <p className="text-sm">Desktop Layer Canvas</p>
            <p className="text-xs">Drag notes to reposition</p>
          </div>
        </div>

        {pinned.map(note => {
          const cfg = COLOR_MAP[note.color]
          const mc  = modeColor(note.desktopMode)
          const ml  = modeLabel(note.desktopMode)
          return (
            <div
              key={note.id}
              className="absolute rounded-xl border-2 shadow-xl select-none"
              style={{
                left: note.position.x,
                top: note.position.y,
                width: note.size.width,
                minHeight: 120,
                background: cfg.bg,
                color: cfg.text,
                opacity: note.opacity / 100,
                borderColor: mc + '66',
                cursor: dragging === note.id ? 'grabbing' : 'grab',
                zIndex: dragging === note.id ? 100 : 1,
              }}
              onMouseDown={e => startDrag(e, note)}
            >
              {/* Mode indicator */}
              <div className="flex items-center gap-1 px-2.5 pt-2 pb-0 text-[9px] font-mono font-semibold" style={{ color: mc }}>
                <span className="w-1.5 h-1.5 rounded-full pulse" style={{ background: mc }} />
                {ml}
              </div>

              {/* Header */}
              <div className="px-2.5 pt-1.5 pb-1">
                <div className="text-[12px] font-semibold">{note.title}</div>
              </div>

              {/* Body */}
              {note.body && (
                <div className="px-2.5 pb-2 text-[11px] opacity-75 leading-relaxed line-clamp-4 whitespace-pre-line">
                  {note.body}
                </div>
              )}

              {/* Checklist preview */}
              {note.type === 'checklist' && note.checklist.slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-0.5 text-[11px]">
                  <span className={`w-3 h-3 rounded-sm border border-current/30 flex items-center justify-center text-[8px] ${c.done ? 'bg-current/20' : ''}`}>{c.done ? '✓' : ''}</span>
                  <span className={c.done ? 'line-through opacity-50' : ''}>{c.text}</span>
                </div>
              ))}
              {note.checklist.length > 3 && (
                <p className="px-2.5 text-[10px] opacity-50 pb-1">+{note.checklist.length - 3} more</p>
              )}

              {/* Footer */}
              <div className="flex items-center gap-1 px-2 py-1.5 border-t border-black/10 mt-auto">
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => openEditor(note.id)}
                  className="flex-1 text-[10px] py-1 rounded-lg bg-black/10 hover:bg-black/20 border-none cursor-pointer text-current transition-colors"
                >
                  <i className="ti ti-edit" /> Edit
                </button>
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => openOnDesktop(note)}
                  className="flex-1 text-[10px] py-1 rounded-lg bg-black/10 hover:bg-black/20 border-none cursor-pointer text-current transition-colors"
                >
                  <i className="ti ti-external-link" /> Open
                </button>
              </div>
            </div>
          )
        })}

        {pinned.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-[var(--text-3)]">
              <i className="ti ti-pin-off text-4xl block mb-2 opacity-30" />
              <p className="text-sm mb-1">No desktop notes yet</p>
              <p className="text-xs">Set a note's mode to "Always Top" or "Desktop Layer"</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
