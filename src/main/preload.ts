import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { Note, Reminder, AppSettings } from '../shared/types'

// Cache note payloads pushed from main before React mounts
const noteCache = new Map<string, Note>()
ipcRenderer.on('note:updated', (_event, note: Note) => {
  if (note?.id) noteCache.set(note.id, note)
})

// ─── Exposed API ──────────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Notes ──────────────────────────────────────────────────────────────────
  notes: {
    getAll:      ()             => ipcRenderer.invoke(IPC.NOTES_GET_ALL),
    get:         (id: string)   => ipcRenderer.invoke(IPC.NOTES_GET_ONE, id),
    getBootstrap:(id: string)   => ipcRenderer.invoke(IPC.NOTES_GET_BOOTSTRAP, id),
    getCached:   (id: string)   => noteCache.get(id) ?? null,
    create:      (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => ipcRenderer.invoke(IPC.NOTES_CREATE, note),
    update:      (id: string, patch: Partial<Note>)                   => ipcRenderer.invoke(IPC.NOTES_UPDATE, id, patch),
    delete:      (id: string)   => ipcRenderer.invoke(IPC.NOTES_DELETE, id),
    duplicate:   (id: string)   => ipcRenderer.invoke(IPC.NOTES_DUPLICATE, id),
  },

  // ── Reminders ──────────────────────────────────────────────────────────────
  reminders: {
    getAll:   ()                       => ipcRenderer.invoke(IPC.REMINDERS_GET_ALL),
    create:   (r: Omit<Reminder, 'id' | 'createdAt'>) => ipcRenderer.invoke(IPC.REMINDERS_CREATE, r),
    update:   (id: string, patch: Partial<Reminder>)  => ipcRenderer.invoke(IPC.REMINDERS_UPDATE, id, patch),
    delete:   (id: string)             => ipcRenderer.invoke(IPC.REMINDERS_DELETE, id),
    snooze:   (id: string, min: number)=> ipcRenderer.invoke(IPC.REMINDER_SNOOZE, id, min),
    complete: (id: string)             => ipcRenderer.invoke(IPC.REMINDER_COMPLETE, id),
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  settings: {
    get: ()                        => ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: (patch: Partial<AppSettings>) => ipcRenderer.invoke(IPC.SETTINGS_SET, patch),
  },

  // ── Window ─────────────────────────────────────────────────────────────────
  window: {
    newNote:    (noteId?: string) => ipcRenderer.invoke(IPC.WIN_NEW_NOTE, noteId),
    closeNote:  (noteId: string)  => ipcRenderer.invoke(IPC.WIN_CLOSE_NOTE, noteId),
    setMode:    (noteId: string, mode: string) => ipcRenderer.invoke(IPC.WIN_SET_MODE, noteId, mode),
    focus:      ()                => ipcRenderer.invoke(IPC.WIN_FOCUS),
    hide:       ()                => ipcRenderer.invoke(IPC.WIN_HIDE),
    quit:       ()                => ipcRenderer.invoke(IPC.APP_QUIT),
  },

  app: {
    backup: () => ipcRenderer.invoke(IPC.DB_BACKUP),
  },

  // ── Events ─────────────────────────────────────────────────────────────────
  on: (channel: string, fn: (...args: unknown[]) => void) => {
    const allowed = [
      IPC.REMINDER_FIRED,
      'theme:updated',
      'note:quickCapture',
      'nav:reminders',
      'nav:settings',
      'note:positionChanged',
      'note:sizeChanged',
      'note:updated',
    ]
    if (allowed.includes(channel as string)) {
      ipcRenderer.on(channel, (_event, ...args) => fn(...args))
    }
  },
  off: (channel: string, fn: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, fn as Parameters<typeof ipcRenderer.removeListener>[1])
  },
})

// ─── Type augmentation for renderer ──────────────────────────────────────────

export type ElectronAPI = {
  notes: {
    getAll:       () => Promise<Note[]>
    get:          (id: string) => Promise<Note | null>
    getBootstrap: (id: string) => Promise<Note | null>
    getCached:    (id: string) => Note | null
    create:       (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>
    update:       (id: string, patch: Partial<Note>) => Promise<Note>
    delete:       (id: string) => Promise<void>
    duplicate:    (id: string) => Promise<Note>
  }
  reminders: {
    getAll:   () => Promise<Reminder[]>
    create:   (r: Omit<Reminder, 'id' | 'createdAt'>) => Promise<Reminder>
    update:   (id: string, patch: Partial<Reminder>) => Promise<Reminder>
    delete:   (id: string) => Promise<void>
    snooze:   (id: string, min: number) => Promise<void>
    complete: (id: string) => Promise<void>
  }
  settings: {
    get: () => Promise<AppSettings>
    set: (patch: Partial<AppSettings>) => Promise<AppSettings>
  }
  window: {
    newNote:   (noteId?: string) => Promise<void>
    closeNote: (noteId: string) => Promise<void>
    setMode:   (noteId: string, mode: string) => Promise<void>
    focus:     () => Promise<void>
    hide:      () => Promise<void>
    quit:      () => Promise<void>
  }
  on:  (channel: string, fn: (...args: unknown[]) => void) => void
  off: (channel: string, fn: (...args: unknown[]) => void) => void
}
