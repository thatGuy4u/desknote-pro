import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron'
import { getPublicPath } from './paths'

let tray: Tray | null = null

export function setupTray(mainWindow: BrowserWindow) {
  const icon = nativeImage.createFromPath(getPublicPath('tray-icon.ico'))

  // Resize for tray
  const trayIcon = icon.isEmpty()
    ? nativeImage.createEmpty()
    : icon.resize({ width: 16, height: 16 })

  tray = new Tray(trayIcon)
  tray.setToolTip('DeskNote Pro')

  const menu = Menu.buildFromTemplate([
    {
      label: '📝 New Note',
      accelerator: 'CommandOrControl+Shift+N',
      click: () => mainWindow.webContents.send('note:quickCapture'),
    },
    {
      label: '🔔 New Reminder',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('nav:reminders')
      },
    },
    { type: 'separator' },
    {
      label: '🏠 Open Dashboard',
      click: () => { mainWindow.show(); mainWindow.focus() },
    },
    { type: 'separator' },
    {
      label: '⚙️ Settings',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('nav:settings')
      },
    },
    { type: 'separator' },
    {
      label: '❌ Quit DeskNote Pro',
      click: () => {
        mainWindow.removeAllListeners('close')
        app.quit()
      },
    },
  ])

  tray.setContextMenu(menu)

  tray.on('double-click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

export function updateTrayMenu(mainWindow: BrowserWindow) {
  // Called to refresh menu dynamically
  setupTray(mainWindow)
}
