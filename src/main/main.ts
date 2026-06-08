import { app, BrowserWindow, ipcMain, nativeTheme, shell, globalShortcut, nativeImage } from 'electron'
import path from 'path'
import { getPublicPath } from './paths'
import { setupTray } from './tray'
import { setupIpcHandlers } from './ipcHandlers'
import { DatabaseService } from './database'
import { ReminderEngine } from './reminderEngine'
import { NoteWindowManager } from './noteWindowManager'
import { SettingsService } from './settings'

// ─── Globals ─────────────────────────────────────────────────────────────────

export let mainWindow: BrowserWindow | null = null
export let db: DatabaseService
export let settings: SettingsService
export let reminderEngine: ReminderEngine
export let noteWindowManager: NoteWindowManager

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const RENDERER_URL = isDev ? 'http://localhost:5173' : path.join(__dirname, '../renderer/index.html')

// ─── Single Instance Lock ─────────────────────────────────────────────────────

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// ─── App Init ─────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Init services
  db = new DatabaseService()
  settings = new SettingsService()
  noteWindowManager = new NoteWindowManager()
  reminderEngine = new ReminderEngine(db, noteWindowManager)

  // Apply startup setting
  const appSettings = settings.get()
  app.setLoginItemSettings({ openAtLogin: appSettings.launchAtStartup })

  // Setup
  createMainWindow()
  setupTray(mainWindow!)
  setupIpcHandlers({ db, settings, reminderEngine, noteWindowManager, mainWindow: mainWindow! })

  // Register global shortcut: Ctrl+Shift+N → quick capture
  globalShortcut.register(appSettings.globalShortcut || 'CommandOrControl+Shift+N', () => {
    noteWindowManager.createQuickCapture()
  })

  // Restore pinned notes
  if (appSettings.restorePinnedOnBoot) {
    const notes = db.getNotes().filter(n => n.desktopMode !== 'normal' && !n.archived)
    for (const note of notes) {
      noteWindowManager.openNoteWindow(note)
    }
  }

  // Start reminder engine
  reminderEngine.start()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray on all platforms
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  reminderEngine.stop()
})

// ─── Main Window ──────────────────────────────────────────────────────────────

function getAppIcon() {
  const icon = nativeImage.createFromPath(getPublicPath('icon.png'))
  return icon.isEmpty() ? undefined : icon
}

function createMainWindow() {
  const appIcon = getAppIcon()
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: process.platform !== 'darwin',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon: appIcon,
    backgroundColor: '#0a0e1a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Load renderer
  if (isDev) {
    mainWindow.loadURL(RENDERER_URL)
  } else {
    mainWindow.loadFile(RENDERER_URL)
  }

  mainWindow.once('ready-to-show', () => {
    const appSettings = settings.get()
    if (!appSettings.startMinimized) mainWindow!.show()
  })

  mainWindow.on('close', (e) => {
    // Minimize to tray instead of closing
    e.preventDefault()
    mainWindow!.hide()
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Theme sync
  nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('theme:updated', nativeTheme.shouldUseDarkColors)
  })
}
