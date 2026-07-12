// ─── Note ───────────────────────────────────────────────────────────────────

export type NoteColor =
  | 'yellow' | 'blue' | 'green' | 'purple'
  | 'pink' | 'red' | 'gray' | 'dark' | 'white'

export type DesktopMode = 'normal' | 'always-on-top' | 'desktop-layer'

export type NoteType = 'text' | 'checklist'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Note {
  id: string
  title: string
  body: string
  color: NoteColor
  type: NoteType
  checklist: ChecklistItem[]
  pinned: boolean
  favorite: boolean
  locked: boolean
  archived: boolean
  opacity: number          // 20–100
  desktopMode: DesktopMode
  position: { x: number; y: number }
  size: { width: number; height: number }
  createdAt: string        // ISO
  updatedAt: string        // ISO
}

// ─── Reminder ───────────────────────────────────────────────────────────────

export type RepeatMode = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Reminder {
  id: string
  noteId: string | null
  title: string
  body: string
  dueAt: string            // ISO
  repeat: RepeatMode
  sound: string            // filename or 'system'
  volume: number           // 0–100
  snoozedUntil: string | null
  completed: boolean
  createdAt: string
}

// ─── Settings ───────────────────────────────────────────────────────────────

export type ThemeMode = 'dark' | 'light' | 'system'

export interface AppSettings {
  theme: ThemeMode
  launchAtStartup: boolean
  startMinimized: boolean
  globalShortcut: string
  globalShortcutEnabled: boolean
  defaultOpacity: number
  defaultColor: NoteColor
  defaultDesktopMode: DesktopMode
  reminderSound: string
  reminderVolume: number
  defaultSnoozeMinutes: number
  repeatAlarmUntilDismissed: boolean
  autoBackup: boolean
  encryptLockedNotes: boolean
  glassmorphism: boolean
  animations: boolean
  restorePinnedOnBoot: boolean
}

// ─── IPC Channels ────────────────────────────────────────────────────────────

export const IPC = {
  // Notes
  NOTES_GET_ALL:      'notes:getAll',
  NOTES_GET_ONE:      'notes:getOne',
  NOTES_GET_BOOTSTRAP:'notes:getBootstrap',
  NOTES_CREATE:       'notes:create',
  NOTES_UPDATE:       'notes:update',
  NOTES_DELETE:       'notes:delete',
  NOTES_DUPLICATE:    'notes:duplicate',

  // Reminders
  REMINDERS_GET_ALL:  'reminders:getAll',
  REMINDERS_CREATE:   'reminders:create',
  REMINDERS_UPDATE:   'reminders:update',
  REMINDERS_DELETE:   'reminders:delete',
  REMINDER_FIRED:     'reminders:fired',
  REMINDER_SNOOZE:    'reminders:snooze',
  REMINDER_COMPLETE:  'reminders:complete',

  // Settings
  SETTINGS_GET:       'settings:get',
  SETTINGS_SET:       'settings:set',

  // Window / Desktop
  WIN_NEW_NOTE:       'win:newNote',
  WIN_CLOSE_NOTE:     'win:closeNote',
  WIN_SET_MODE:       'win:setMode',
  WIN_FOCUS:          'win:focus',
  WIN_HIDE:           'win:hide',

  // Tray
  TRAY_SHOW:          'tray:show',
  TRAY_HIDE:          'tray:hide',

  // App
  APP_VERSION:        'app:version',
  APP_QUIT:           'app:quit',
  APP_RELAUNCH:       'app:relaunch',
  DB_BACKUP:          'db:backup',
} as const

export type IpcChannel = typeof IPC[keyof typeof IPC]
