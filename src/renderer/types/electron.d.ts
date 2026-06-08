import type { Note, Reminder, AppSettings } from '../../shared/types'

declare global {
  interface Window {
    electronAPI: {
      notes: {
        getAll:    () => Promise<Note[]>
        get:          (id: string) => Promise<Note | null>
        getBootstrap: (id: string) => Promise<Note | null>
        getCached:    (id: string) => Note | null
        create:    (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>
        update:    (id: string, patch: Partial<Note>) => Promise<Note>
        delete:    (id: string) => Promise<void>
        duplicate: (id: string) => Promise<Note>
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
      app: {
        backup: () => Promise<string>
      }
      on:  (channel: string, fn: (...args: unknown[]) => void) => void
      off: (channel: string, fn: (...args: unknown[]) => void) => void
    } | undefined
  }
}

export {}
