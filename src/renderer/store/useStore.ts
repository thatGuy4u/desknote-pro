import { create } from 'zustand'
import type { Note, Reminder, AppSettings } from '@shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ViewMode = 'all' | 'pinned' | 'favorites' | 'archived' | 'reminders' | 'desktop' | 'settings'
export type ColorFilter = 'all' | 'yellow' | 'blue' | 'green' | 'purple' | 'pink' | 'red' | 'gray' | 'dark' | 'white'

interface AppState {
  // Data
  notes: Note[]
  reminders: Reminder[]
  settings: AppSettings | null

  // UI State
  view: ViewMode
  searchQuery: string
  colorFilter: ColorFilter
  editingNoteId: string | null
  editorOpen: boolean
  pendingReminders: Reminder[]
  isLoading: boolean

  // Actions
  setNotes: (notes: Note[]) => void
  addNote: (note: Note) => void
  updateNote: (id: string, patch: Partial<Note>) => void
  removeNote: (id: string) => void

  setReminders: (reminders: Reminder[]) => void
  addReminder: (r: Reminder) => void
  updateReminder: (id: string, patch: Partial<Reminder>) => void
  removeReminder: (id: string) => void
  addPendingReminder: (r: Reminder) => void
  dismissPendingReminder: (id: string) => void

  setSettings: (s: AppSettings) => void
  setView: (v: ViewMode) => void
  setSearch: (q: string) => void
  setColorFilter: (c: ColorFilter) => void
  openEditor: (noteId: string | null) => void
  closeEditor: () => void
  setLoading: (v: boolean) => void
}

// ─── Default Settings ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  launchAtStartup: false,
  startMinimized: false,
  globalShortcut: 'CommandOrControl+Shift+N',
  globalShortcutEnabled: true,
  defaultOpacity: 100,
  defaultColor: 'dark',
  defaultDesktopMode: 'normal',
  reminderSound: 'system',
  reminderVolume: 80,
  defaultSnoozeMinutes: 5,
  repeatAlarmUntilDismissed: false,
  autoBackup: true,
  encryptLockedNotes: true,
  glassmorphism: true,
  animations: true,
  restorePinnedOnBoot: true,
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set) => ({
  notes: [],
  reminders: [],
  settings: DEFAULT_SETTINGS,
  view: 'all',
  searchQuery: '',
  colorFilter: 'all',
  editingNoteId: null,
  editorOpen: false,
  pendingReminders: [],
  isLoading: true,

  setNotes:    (notes) => set({ notes }),
  addNote:     (note)  => set(s => ({ notes: [note, ...s.notes] })),
  updateNote:  (id, patch) => set(s => ({
    notes: s.notes.map(n => n.id === id ? { ...n, ...patch } : n),
  })),
  removeNote:  (id)  => set(s => ({ notes: s.notes.filter(n => n.id !== id) })),

  setReminders:    (reminders) => set({ reminders }),
  addReminder:     (r)  => set(s => ({ reminders: [...s.reminders, r] })),
  updateReminder:  (id, patch) => set(s => ({
    reminders: s.reminders.map(r => r.id === id ? { ...r, ...patch } : r),
  })),
  removeReminder:  (id) => set(s => ({ reminders: s.reminders.filter(r => r.id !== id) })),
  addPendingReminder:     (r) => set(s => ({ pendingReminders: [...s.pendingReminders, r] })),
  dismissPendingReminder: (id) => set(s => ({ pendingReminders: s.pendingReminders.filter(r => r.id !== id) })),

  setSettings:    (settings) => set({ settings }),
  setView:        (view) => set({ view, editingNoteId: null, editorOpen: false }),
  setSearch:      (searchQuery) => set({ searchQuery }),
  setColorFilter: (colorFilter) => set({ colorFilter }),
  openEditor:     (editingNoteId) => set({ editingNoteId, editorOpen: true }),
  closeEditor:    () => set({ editingNoteId: null, editorOpen: false }),
  setLoading:     (isLoading) => set({ isLoading }),
}))

// ─── Selectors ────────────────────────────────────────────────────────────────

export function selectFilteredNotes(state: AppState): Note[] {
  let notes = state.notes

  switch (state.view) {
    case 'pinned':    notes = notes.filter(n => n.pinned && !n.archived); break
    case 'favorites': notes = notes.filter(n => n.favorite && !n.archived); break
    case 'archived':  notes = notes.filter(n => n.archived); break
    default:          notes = notes.filter(n => !n.archived); break
  }

  if (state.colorFilter !== 'all') {
    notes = notes.filter(n => n.color === state.colorFilter)
  }

  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase()
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q) ||
      n.checklist.some(c => c.text.toLowerCase().includes(q))
    )
  }

  return notes
}
