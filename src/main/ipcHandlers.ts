import { ipcMain, app, BrowserWindow, globalShortcut } from 'electron'
import { IPC } from '../shared/types'
import type { DatabaseService } from './database'
import type { SettingsService } from './settings'
import type { ReminderEngine } from './reminderEngine'
import type { NoteWindowManager } from './noteWindowManager'
import type { Note, Reminder, AppSettings, DesktopMode } from '../shared/types'

interface Services {
  db: DatabaseService
  settings: SettingsService
  reminderEngine: ReminderEngine
  noteWindowManager: NoteWindowManager
  mainWindow: BrowserWindow
}

export function setupIpcHandlers(services: Services) {
  const { db, settings, reminderEngine, noteWindowManager, mainWindow } = services

  function registerQuickCaptureShortcut(shortcut: string) {
    globalShortcut.unregisterAll()
    globalShortcut.register(shortcut || 'CommandOrControl+Shift+N', () => {
      noteWindowManager.createQuickCapture()
    })
  }

  function syncDesktopWindow(note: Note, mode?: DesktopMode) {
    const desktopMode = mode ?? note.desktopMode
    if (desktopMode === 'normal') {
      noteWindowManager.closeNoteWindow(note.id)
      return
    }
    noteWindowManager.openNoteWindow(note)
    noteWindowManager.setMode(note.id, desktopMode)
  }

  // ── Notes ────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.NOTES_GET_ALL, () => db.getNotes())

  ipcMain.handle(IPC.NOTES_GET_ONE, (_e, id: string) => db.getNote(id))

  ipcMain.handle(IPC.NOTES_GET_BOOTSTRAP, (_e, id: string) => {
    return noteWindowManager.consumeBootstrapNote(id) ?? db.getNote(id)
  })

  ipcMain.handle(IPC.NOTES_CREATE, (_e, data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const note = db.createNote(data)
    if (note.desktopMode !== 'normal') {
      syncDesktopWindow(note)
      noteWindowManager.pushNoteUpdate(note)
    }
    return note
  })

  ipcMain.handle(IPC.NOTES_UPDATE, (_e, id: string, patch: Partial<Note>) => {
    const updated = db.updateNote(id, patch)
    if (!updated) return null
    if (patch.desktopMode) {
      syncDesktopWindow(updated, patch.desktopMode as DesktopMode)
    }
    if (updated.desktopMode !== 'normal') {
      noteWindowManager.pushNoteUpdate(updated)
    }
    return updated
  })

  ipcMain.handle(IPC.NOTES_DELETE, (_e, id: string) => {
    noteWindowManager.closeNoteWindow(id)
    db.deleteNote(id)
  })

  ipcMain.handle(IPC.NOTES_DUPLICATE, (_e, id: string) => db.duplicateNote(id))

  // ── Reminders ────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.REMINDERS_GET_ALL, () => db.getReminders())

  ipcMain.handle(IPC.REMINDERS_CREATE, (_e, data: Omit<Reminder, 'id' | 'createdAt'>) => {
    return db.createReminder(data)
  })

  ipcMain.handle(IPC.REMINDERS_UPDATE, (_e, id: string, patch: Partial<Reminder>) => {
    return db.updateReminder(id, patch)
  })

  ipcMain.handle(IPC.REMINDERS_DELETE, (_e, id: string) => db.deleteReminder(id))

  ipcMain.handle(IPC.REMINDER_SNOOZE, (_e, id: string, minutes: number) => {
    reminderEngine.snooze(id, minutes)
  })

  ipcMain.handle(IPC.REMINDER_COMPLETE, (_e, id: string) => {
    reminderEngine.dismiss(id)
  })

  // ── Settings ─────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.SETTINGS_GET, () => settings.get())

  ipcMain.handle(IPC.SETTINGS_SET, (_e, patch: Partial<AppSettings>) => {
    const updated = settings.set(patch)
    if ('launchAtStartup' in patch) {
      app.setLoginItemSettings({ openAtLogin: patch.launchAtStartup! })
    }
    if ('globalShortcut' in patch) {
      registerQuickCaptureShortcut(updated.globalShortcut)
    }
    return updated
  })

  // ── Window ───────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.WIN_NEW_NOTE, (_e, noteId?: string) => {
    if (noteId) {
      const note = db.getNote(noteId)
      if (note) noteWindowManager.openNoteWindow(note)
    } else {
      noteWindowManager.createQuickCapture()
    }
  })

  ipcMain.handle(IPC.WIN_CLOSE_NOTE, (_e, noteId: string) => {
    noteWindowManager.closeNoteWindow(noteId)
  })

  ipcMain.handle(IPC.WIN_SET_MODE, (_e, noteId: string, mode: string) => {
    noteWindowManager.setMode(noteId, mode as DesktopMode)
  })

  ipcMain.handle(IPC.WIN_FOCUS, () => {
    mainWindow.show()
    mainWindow.focus()
  })

  ipcMain.handle(IPC.WIN_HIDE, () => {
    mainWindow.hide()
  })

  // ── App ──────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.APP_VERSION, () => app.getVersion())

  ipcMain.handle(IPC.APP_QUIT, () => {
    // Override the close handler for real quit
    mainWindow.removeAllListeners('close')
    app.quit()
  })

  ipcMain.handle(IPC.APP_RELAUNCH, () => {
    app.relaunch()
    app.quit()
  })

  ipcMain.handle(IPC.DB_BACKUP, () => db.backup())
}
