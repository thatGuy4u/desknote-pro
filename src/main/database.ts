import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { v4 as uuid } from 'uuid'
import type { Note, Reminder, NoteColor, DesktopMode, NoteType, RepeatMode } from '../shared/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS notes (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL DEFAULT '',
    body        TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT 'yellow',
    type        TEXT NOT NULL DEFAULT 'text',
    checklist   TEXT NOT NULL DEFAULT '[]',
    pinned      INTEGER NOT NULL DEFAULT 0,
    favorite    INTEGER NOT NULL DEFAULT 0,
    locked      INTEGER NOT NULL DEFAULT 0,
    archived    INTEGER NOT NULL DEFAULT 0,
    opacity     INTEGER NOT NULL DEFAULT 100,
    desktopMode TEXT NOT NULL DEFAULT 'normal',
    posX        INTEGER NOT NULL DEFAULT 100,
    posY        INTEGER NOT NULL DEFAULT 100,
    sizeW       INTEGER NOT NULL DEFAULT 280,
    sizeH       INTEGER NOT NULL DEFAULT 200,
    createdAt   TEXT NOT NULL,
    updatedAt   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id           TEXT PRIMARY KEY,
    noteId       TEXT,
    title        TEXT NOT NULL DEFAULT '',
    body         TEXT NOT NULL DEFAULT '',
    dueAt        TEXT NOT NULL,
    repeat       TEXT NOT NULL DEFAULT 'none',
    sound        TEXT NOT NULL DEFAULT 'system',
    volume       INTEGER NOT NULL DEFAULT 80,
    snoozedUntil TEXT,
    completed    INTEGER NOT NULL DEFAULT 0,
    createdAt    TEXT NOT NULL
  );
`

// ─── DatabaseService ──────────────────────────────────────────────────────────

export class DatabaseService {
  private db: Database.Database

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'desknote.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.exec(SCHEMA)
    this.migrate()
  }

  private migrate() {
    const notesOk = this.tableHasColumns('notes', [
      'id', 'title', 'body', 'color', 'type', 'checklist', 'pinned', 'favorite',
      'locked', 'archived', 'opacity', 'desktopMode', 'posX', 'posY', 'sizeW', 'sizeH',
      'createdAt', 'updatedAt',
    ])
    const remindersOk = this.tableHasColumns('reminders', [
      'id', 'noteId', 'title', 'body', 'dueAt', 'repeat', 'sound', 'volume',
      'snoozedUntil', 'completed', 'createdAt',
    ])

    if (notesOk && remindersOk) return

    const backupPath = path.join(
      app.getPath('userData'),
      `desknote-schema-backup-${Date.now()}.db`
    )
    this.db.backup(backupPath)
    this.db.exec('DROP TABLE IF EXISTS notes; DROP TABLE IF EXISTS reminders;')
    this.db.exec(SCHEMA)
    console.warn(`[DeskNote] Database schema was outdated. Old data backed up to:\n  ${backupPath}`)
  }

  private tableHasColumns(table: string, required: string[]): boolean {
    const info = this.db.pragma(`table_info(${table})`) as Array<{ name: string }>
    if (!info.length) return false
    const names = new Set(info.map(col => col.name))
    return required.every(col => names.has(col))
  }

  // ── Notes ──────────────────────────────────────────────────────────────────

  getNotes(): Note[] {
    const rows = this.db.prepare('SELECT * FROM notes ORDER BY updatedAt DESC').all() as RawNote[]
    return rows.map(rowToNote)
  }

  getNote(id: string): Note | null {
    const row = this.db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as RawNote | undefined
    return row ? rowToNote(row) : null
  }

  createNote(data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note {
    const now = new Date().toISOString()
    const note: Note = {
      ...data,
      id: uuid(),
      createdAt: now,
      updatedAt: now,
    }
    this.db.prepare(`
      INSERT INTO notes (id,title,body,color,type,checklist,pinned,favorite,locked,archived,
        opacity,desktopMode,posX,posY,sizeW,sizeH,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      note.id, note.title, note.body, note.color, note.type,
      JSON.stringify(note.checklist),
      note.pinned ? 1 : 0, note.favorite ? 1 : 0,
      note.locked ? 1 : 0, note.archived ? 1 : 0,
      note.opacity, note.desktopMode,
      note.position.x, note.position.y,
      note.size.width, note.size.height,
      note.createdAt, note.updatedAt
    )
    return note
  }

  updateNote(id: string, patch: Partial<Note>): Note | null {
    const existing = this.getNote(id)
    if (!existing) return null
    const updated: Note = { ...existing, ...patch, id, updatedAt: new Date().toISOString() }
    this.db.prepare(`
      UPDATE notes SET title=?,body=?,color=?,type=?,checklist=?,pinned=?,favorite=?,locked=?,
        archived=?,opacity=?,desktopMode=?,posX=?,posY=?,sizeW=?,sizeH=?,updatedAt=?
      WHERE id=?
    `).run(
      updated.title, updated.body, updated.color, updated.type,
      JSON.stringify(updated.checklist),
      updated.pinned ? 1 : 0, updated.favorite ? 1 : 0,
      updated.locked ? 1 : 0, updated.archived ? 1 : 0,
      updated.opacity, updated.desktopMode,
      updated.position.x, updated.position.y,
      updated.size.width, updated.size.height,
      updated.updatedAt, id
    )
    return updated
  }

  deleteNote(id: string): void {
    this.db.prepare('DELETE FROM notes WHERE id = ?').run(id)
  }

  duplicateNote(id: string): Note | null {
    const note = this.getNote(id)
    if (!note) return null
    return this.createNote({
      ...note,
      title: note.title + ' (copy)',
      pinned: false,
      desktopMode: 'normal',
    })
  }

  // ── Reminders ──────────────────────────────────────────────────────────────

  getReminders(): Reminder[] {
    const rows = this.db.prepare('SELECT * FROM reminders ORDER BY dueAt ASC').all() as RawReminder[]
    return rows.map(rowToReminder)
  }

  getPendingReminders(): Reminder[] {
    const now = new Date().toISOString()
    const rows = this.db.prepare(`
      SELECT * FROM reminders
      WHERE completed = 0
        AND (snoozedUntil IS NULL OR snoozedUntil <= ?)
        AND dueAt <= ?
    `).all(now, now) as RawReminder[]
    return rows.map(rowToReminder)
  }

  getUpcomingReminders(): Reminder[] {
    const now = new Date().toISOString()
    const rows = this.db.prepare(`
      SELECT * FROM reminders
      WHERE completed = 0 AND dueAt > ?
      ORDER BY dueAt ASC
    `).all(now) as RawReminder[]
    return rows.map(rowToReminder)
  }

  createReminder(data: Omit<Reminder, 'id' | 'createdAt'>): Reminder {
    const now = new Date().toISOString()
    const reminder: Reminder = { ...data, id: uuid(), createdAt: now }
    this.db.prepare(`
      INSERT INTO reminders (id,noteId,title,body,dueAt,repeat,sound,volume,snoozedUntil,completed,createdAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      reminder.id, reminder.noteId, reminder.title, reminder.body,
      reminder.dueAt, reminder.repeat, reminder.sound, reminder.volume,
      reminder.snoozedUntil, reminder.completed ? 1 : 0, reminder.createdAt
    )
    return reminder
  }

  updateReminder(id: string, patch: Partial<Reminder>): Reminder | null {
    const rows = this.db.prepare('SELECT * FROM reminders WHERE id = ?').all(id) as RawReminder[]
    if (!rows.length) return null
    const existing = rowToReminder(rows[0])
    const updated: Reminder = { ...existing, ...patch, id }
    this.db.prepare(`
      UPDATE reminders SET noteId=?,title=?,body=?,dueAt=?,repeat=?,sound=?,volume=?,
        snoozedUntil=?,completed=?
      WHERE id=?
    `).run(
      updated.noteId, updated.title, updated.body, updated.dueAt,
      updated.repeat, updated.sound, updated.volume,
      updated.snoozedUntil, updated.completed ? 1 : 0, id
    )
    return updated
  }

  deleteReminder(id: string): void {
    this.db.prepare('DELETE FROM reminders WHERE id = ?').run(id)
  }

  // ── Backup ─────────────────────────────────────────────────────────────────

  backup(): string {
    const backupDir = path.join(app.getPath('userData'), 'backups')
    fs.mkdirSync(backupDir, { recursive: true })
    const backupPath = path.join(backupDir, `desknote-${Date.now()}.db`)
    this.db.backup(backupPath)
    return backupPath
  }

  close(): void {
    this.db.close()
  }
}

// ─── Row Mappers ──────────────────────────────────────────────────────────────

interface RawNote {
  id: string; title: string; body: string; color: string; type: string
  checklist: string; pinned: number; favorite: number; locked: number
  archived: number; opacity: number; desktopMode: string
  posX: number; posY: number; sizeW: number; sizeH: number
  createdAt: string; updatedAt: string
}

function rowToNote(r: RawNote): Note {
  return {
    id: r.id, title: r.title, body: r.body,
    color: r.color as NoteColor, type: r.type as NoteType,
    checklist: JSON.parse(r.checklist),
    pinned: r.pinned === 1, favorite: r.favorite === 1,
    locked: r.locked === 1, archived: r.archived === 1,
    opacity: r.opacity, desktopMode: r.desktopMode as DesktopMode,
    position: { x: r.posX, y: r.posY },
    size: { width: r.sizeW, height: r.sizeH },
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  }
}

interface RawReminder {
  id: string; noteId: string | null; title: string; body: string; dueAt: string
  repeat: string; sound: string; volume: number
  snoozedUntil: string | null; completed: number; createdAt: string
}

function rowToReminder(r: RawReminder): Reminder {
  return {
    id: r.id, noteId: r.noteId, title: r.title, body: r.body,
    dueAt: r.dueAt, repeat: r.repeat as RepeatMode,
    sound: r.sound, volume: r.volume,
    snoozedUntil: r.snoozedUntil, completed: r.completed === 1,
    createdAt: r.createdAt,
  }
}
