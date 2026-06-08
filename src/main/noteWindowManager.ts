import { BrowserWindow, screen, nativeImage } from 'electron'
import path from 'path'
import { pathToFileURL } from 'url'
import type { Note, DesktopMode } from '../shared/types'
import { encodeNoteSnapshot } from '../shared/noteSnapshot'
import { getPublicPath } from './paths'
import { attachWindowToDesktopLayer, detachWindowFromDesktopLayer } from './winDesktopLayer'

const isDev = process.env.NODE_ENV === 'development' || !require('electron').app.isPackaged

// Electron supports 'desktop' at runtime; @types/electron omits it from setAlwaysOnTop levels.
type AlwaysOnTopLevel = NonNullable<Parameters<BrowserWindow['setAlwaysOnTop']>[1]>
const DESKTOP_ICON_LEVEL = 'desktop' as AlwaysOnTopLevel

// ─── NoteWindowManager ────────────────────────────────────────────────────────

function getNoteIcon() {
  const icon = nativeImage.createFromPath(getPublicPath('icon.png'))
  return icon.isEmpty() ? undefined : icon
}

function buildNotePageUrl(params: Record<string, string>, note?: Note): string {
  const query = new URLSearchParams(params).toString()
  const hash = note ? `snap=${encodeURIComponent(encodeNoteSnapshot(note))}` : ''
  const suffix = hash ? `#${hash}` : ''
  if (isDev) return `http://localhost:5173/note.html?${query}${suffix}`
  const htmlPath = path.join(__dirname, '../renderer/note.html')
  return `${pathToFileURL(htmlPath).href}?${query}${suffix}`
}

function deliverNoteToWindow(win: BrowserWindow, note: Note) {
  const send = () => {
    if (!win.isDestroyed()) win.webContents.send('note:updated', note)
  }
  const startDelivery = () => {
    send()
    let attempts = 0
    const timer = setInterval(() => {
      if (win.isDestroyed() || attempts++ >= 8) {
        clearInterval(timer)
        return
      }
      send()
    }, 120)
  }
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', startDelivery)
  } else {
    startDelivery()
  }
}

export class NoteWindowManager {
  private windows = new Map<string, BrowserWindow>()
  /** Full note payloads waiting for the floating window renderer to pick up. */
  private bootstrapNotes = new Map<string, Note>()

  consumeBootstrapNote(id: string): Note | null {
    const note = this.bootstrapNotes.get(id) ?? null
    if (note) this.bootstrapNotes.delete(id)
    return note
  }

  peekBootstrapNote(id: string): Note | null {
    return this.bootstrapNotes.get(id) ?? null
  }

  private scheduleWinDesktopAttach(win: BrowserWindow) {
    const attach = () => attachWindowToDesktopLayer(win)
    const url = win.webContents.getURL()
    if (url && url !== 'about:blank' && !win.webContents.isLoading()) {
      attach()
    } else {
      win.webContents.once('did-finish-load', attach)
    }
  }

  openNoteWindow(note: Note): BrowserWindow {
    this.bootstrapNotes.set(note.id, note)

    // Return existing window if open
    const existing = this.windows.get(note.id)
    if (existing && !existing.isDestroyed()) {
      deliverNoteToWindow(existing, note)
      existing.focus()
      return existing
    }

    const win = this.createNoteWindow(note)
    this.windows.set(note.id, win)
    return win
  }

  private createNoteWindow(note: Note): BrowserWindow {
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize

    const x = Math.min(note.position.x, sw - note.size.width)
    const y = Math.min(note.position.y, sh - note.size.height)

    const win = new BrowserWindow({
      x,
      y,
      width: note.size.width,
      height: note.size.height,
      minWidth: 180,
      minHeight: 120,
      icon: getNoteIcon(),
      frame: false,
      transparent: true,
      resizable: true,
      movable: true,
      hasShadow: true,
      skipTaskbar: note.desktopMode !== 'normal',
      backgroundColor: '#00000000',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    this.applyDesktopMode(win, note.desktopMode)

    const url = buildNotePageUrl({ id: note.id }, note)
    win.loadURL(url)
    deliverNoteToWindow(win, note)

    win.on('closed', () => {
      this.windows.delete(note.id)
    })

    // Save position when moved
    win.on('moved', () => {
      const [nx, ny] = win.getPosition()
      // The renderer will handle the IPC update on position change
      win.webContents.send('note:positionChanged', { x: nx, y: ny })
    })

    win.on('resized', () => {
      const [nw, nh] = win.getSize()
      win.webContents.send('note:sizeChanged', { width: nw, height: nh })
    })

    return win
  }

  applyDesktopMode(win: BrowserWindow, mode: DesktopMode) {
    detachWindowFromDesktopLayer(win)

    switch (mode) {
      case 'always-on-top':
        win.setAlwaysOnTop(true, 'floating')
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })
        win.setSkipTaskbar(true)
        break

      case 'desktop-layer':
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })
        win.setSkipTaskbar(true)
        if (process.platform === 'darwin') {
          // macOS: kCGDesktopIconWindowLevel — behind app windows, above wallpaper
          win.setAlwaysOnTop(true, DESKTOP_ICON_LEVEL, 1)
        } else if (process.platform === 'win32') {
          // Windows: parent to WorkerW so the note sits on the desktop wallpaper layer
          win.setAlwaysOnTop(false)
          this.scheduleWinDesktopAttach(win)
        } else {
          // Linux: lowest z-order, not always on top
          win.setAlwaysOnTop(false)
          win.moveTop()
          win.blur()
        }
        break

      case 'normal':
      default:
        win.setAlwaysOnTop(false)
        win.setVisibleOnAllWorkspaces(false)
        win.setSkipTaskbar(false)
        break
    }
  }

  pushNoteUpdate(note: Note) {
    const win = this.windows.get(note.id)
    if (win && !win.isDestroyed()) deliverNoteToWindow(win, note)
  }

  setMode(noteId: string, mode: DesktopMode) {
    const win = this.windows.get(noteId)
    if (win && !win.isDestroyed()) {
      this.applyDesktopMode(win, mode)
    }
  }

  closeNoteWindow(noteId: string) {
    const win = this.windows.get(noteId)
    if (win && !win.isDestroyed()) {
      detachWindowFromDesktopLayer(win)
      win.destroy()
    }
    this.windows.delete(noteId)
  }

  createQuickCapture() {
    const { width: sw } = screen.getPrimaryDisplay().workAreaSize
    const win = new BrowserWindow({
      x: sw - 340,
      y: 80,
      width: 320,
      height: 240,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: true,
      skipTaskbar: true,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    win.loadURL(buildNotePageUrl({ quickCapture: '1' }))
    win.setVisibleOnAllWorkspaces(true)
    win.focus()
  }

  getAllWindows(): Map<string, BrowserWindow> {
    return this.windows
  }

  closeAll() {
    this.windows.forEach(win => {
      if (!win.isDestroyed()) win.destroy()
    })
    this.windows.clear()
  }
}
