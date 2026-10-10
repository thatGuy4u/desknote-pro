import React from 'react'
import { useStore, ViewMode } from '../../store/useStore'

interface NavItem {
  id: ViewMode
  icon: string
  label: string
  badge?: number | string
  badgeColor?: string
}

export default function Sidebar() {
  const { view, setView, notes, reminders, openEditor } = useStore()

  const allNotes   = notes.filter(n => !n.archived)
  const pinned     = notes.filter(n => n.pinned && !n.archived)
  const favorites  = notes.filter(n => n.favorite && !n.archived)
  const archived   = notes.filter(n => n.archived)
  const upcoming   = reminders.filter(r => !r.completed)

  const navItems: NavItem[] = [
    { id: 'all',       icon: 'ti-notes',            label: 'All Notes',  badge: allNotes.length },
    { id: 'pinned',    icon: 'ti-pin',              label: 'Pinned',     badge: pinned.length },
    { id: 'favorites', icon: 'ti-heart',            label: 'Favorites',  badge: favorites.length },
    { id: 'archived',  icon: 'ti-archive',          label: 'Archived',   badge: archived.length },
  ]

  const toolItems: NavItem[] = [
    { id: 'reminders', icon: 'ti-bell',             label: 'Reminders',  badge: upcoming.length, badgeColor: '#3b82f6' },
    { id: 'desktop',   icon: 'ti-layout-dashboard', label: 'Desktop View' },
    { id: 'settings',  icon: 'ti-settings',         label: 'Settings' },
  ]

  const NavLink = ({ item }: { item: NavItem }) => (
    <button
      onClick={() => setView(item.id)}
      className={`
        w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium
        transition-all duration-150 cursor-pointer border-none text-left
        ${view === item.id
          ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20'
          : 'bg-transparent text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]'
        }
      `}
    >
      <i className={`ti ${item.icon} text-base w-4`} />
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
          style={{
            background: item.badgeColor
              ? item.badgeColor
              : view === item.id ? 'rgba(255,255,255,0.25)' : 'var(--surface-2)',
            color: item.badgeColor ? 'white' : 'inherit',
          }}
        >
          {item.badge}
        </span>
      )}
    </button>
  )

  return (
    <aside className="w-[220px] min-w-[220px] flex flex-col bg-[var(--bg-2)] border-r border-[var(--border)]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6] flex items-center justify-center text-base shadow-lg">
          📌
        </div>
        <div>
          <span className="text-sm font-semibold text-[var(--text-1)]">DeskNote </span>
          <span className="text-[10px] bg-[var(--accent)] text-white px-1.5 py-0.5 rounded-full font-semibold align-middle">Pro</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-[var(--border)]">
        <div className="relative">
          <i className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] text-sm pointer-events-none" />
          <input
            type="text"
            placeholder="Search notes…"
            className="w-full bg-[var(--bg-3)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
            onChange={e => useStore.getState().setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Nav - Notes */}
      <div className="px-3 pt-3 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)] px-2 mb-2">Notes</p>
        <div className="flex flex-col gap-0.5">
          {navItems.map(item => <NavLink key={item.id} item={item} />)}
        </div>
      </div>

      {/* Nav - Tools */}
      <div className="px-3 pt-3 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)] px-2 mb-2">Tools</p>
        <div className="flex flex-col gap-0.5">
          {toolItems.map(item => <NavLink key={item.id} item={item} />)}
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-3 mt-2">
        <button
          onClick={() => openEditor(null)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] text-white text-sm font-medium shadow-lg shadow-[#3b82f6]/30 hover:opacity-90 transition-opacity border-none cursor-pointer"
        >
          <i className="ti ti-plus text-base" />
          New Note
          <kbd className="ml-auto text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono">⌘N</kbd>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-auto px-3 py-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-2)]">
          <span className="w-2 h-2 rounded-full bg-green-400 pulse" />
          <span>Running in Tray</span>
          <span className="ml-auto font-mono text-[10px] text-[var(--text-3)]">v1.1.2</span>
        </div>
      </div>
    </aside>
  )
}
