import React from 'react'
import { useStore, selectFilteredNotes, ColorFilter } from '../../store/useStore'
import NoteCard from './NoteCard'

const COLORS: { key: ColorFilter; label: string; hex: string }[] = [
  { key: 'all',    label: 'All',    hex: '' },
  { key: 'yellow', label: 'Yellow', hex: '#fbbf24' },
  { key: 'blue',   label: 'Blue',   hex: '#60a5fa' },
  { key: 'green',  label: 'Green',  hex: '#34d399' },
  { key: 'purple', label: 'Purple', hex: '#c084fc' },
  { key: 'pink',   label: 'Pink',   hex: '#f472b6' },
  { key: 'red',    label: 'Red',    hex: '#f87171' },
  { key: 'gray',   label: 'Gray',   hex: '#94a3b8' },
]

const VIEW_TITLES: Record<string, string> = {
  all: 'All Notes', pinned: 'Pinned', favorites: 'Favorites', archived: 'Archived',
}

export default function NotesView() {
  const store = useStore()
  const { view, colorFilter, setColorFilter, openEditor } = store
  const filtered = selectFilteredNotes(store)

  const title = VIEW_TITLES[view] ?? 'Notes'

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-[var(--border)] bg-[var(--bg-2)] shrink-0">
        <div>
          <span className="text-base font-semibold">{title}</span>
          <span className="ml-2 text-xs text-[var(--text-3)]">{filtered.length} notes</span>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => openEditor(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md shadow-[var(--accent)]/30"
          >
            <i className="ti ti-plus" /> New Note
          </button>
        </div>
      </div>

      {/* Color filter chips */}
      <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-[var(--border)] bg-[var(--bg-2)] overflow-x-auto shrink-0">
        {COLORS.map(c => (
          <button
            key={c.key}
            onClick={() => setColorFilter(c.key)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all whitespace-nowrap
              ${colorFilter === c.key
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                : 'bg-transparent border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-2)] hover:text-[var(--text-1)]'
              }`}
          >
            {c.hex && <span className="w-2 h-2 rounded-full" style={{ background: c.hex }} />}
            {c.label}
          </button>
        ))}
        <kbd className="ml-auto text-[10px] bg-[var(--bg-3)] border border-[var(--border-2)] rounded px-1.5 py-0.5 font-mono text-[var(--text-2)] shrink-0">⌘N</kbd>
      </div>

      {/* Notes grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-3)] gap-3">
            <i className="ti ti-note-off text-5xl opacity-30" />
            <p className="text-sm">No notes found</p>
            <button
              onClick={() => openEditor(null)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm border-none cursor-pointer hover:opacity-90"
            >
              <i className="ti ti-plus" /> Create your first note
            </button>
          </div>
        ) : (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {filtered.map((note, i) => (
              <NoteCard key={note.id} note={note} delay={i * 40} />
            ))}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex border-t border-[var(--border)] bg-[var(--bg-2)] shrink-0">
        {[
          { label: 'Notes',     value: useStore.getState().notes.filter(n => !n.archived).length },
          { label: 'Pinned',    value: useStore.getState().notes.filter(n => n.pinned && !n.archived).length },
          { label: 'Reminders', value: useStore.getState().reminders.filter(r => !r.completed).length },
          { label: 'Tasks',     value: useStore.getState().notes.reduce((s, n) => s + n.checklist.length, 0) },
        ].map((s, i) => (
          <div key={i} className="flex-1 text-center py-2 border-r border-[var(--border)] last:border-r-0">
            <div className="text-base font-semibold font-mono text-[var(--text-1)]">{s.value}</div>
            <div className="text-[10px] text-[var(--text-3)]">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
