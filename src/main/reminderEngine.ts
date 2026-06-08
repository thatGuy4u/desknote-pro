import { Notification, BrowserWindow, nativeImage, app } from 'electron'
import schedule from 'node-schedule'
import path from 'path'
import type { DatabaseService } from './database'
import type { NoteWindowManager } from './noteWindowManager'
import type { Reminder } from '../shared/types'
import { IPC } from '../shared/types'

export class ReminderEngine {
  private db: DatabaseService
  private winManager: NoteWindowManager
  private job: schedule.Job | null = null
  private activeAlarms = new Map<string, NodeJS.Timeout>()

  constructor(db: DatabaseService, winManager: NoteWindowManager) {
    this.db = db
    this.winManager = winManager
  }

  start() {
    // Check every 30 seconds
    this.job = schedule.scheduleJob('*/30 * * * * *', () => {
      this.checkReminders()
    })
    // Also check immediately on start
    this.checkReminders()
  }

  stop() {
    this.job?.cancel()
    this.activeAlarms.forEach(t => clearTimeout(t))
    this.activeAlarms.clear()
  }

  private async checkReminders() {
    const pending = this.db.getPendingReminders()
    for (const reminder of pending) {
      if (!this.activeAlarms.has(reminder.id)) {
        this.fireReminder(reminder)
      }
    }
  }

  fireReminder(reminder: Reminder) {
    // Native notification
    this.showNativeNotification(reminder)

    // Broadcast to all windows
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send(IPC.REMINDER_FIRED, reminder)
    })

    // If repeat alarm until dismissed, repeat every 2 min
    const settings = this.db  // access through db pattern
    const timer = setInterval(() => {
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send(IPC.REMINDER_FIRED, reminder)
      })
    }, 2 * 60 * 1000)
    this.activeAlarms.set(reminder.id, timer)
  }

  private showNativeNotification(reminder: Reminder) {
    if (!Notification.isSupported()) return

    const iconPath = path.join(app.getAppPath(), 'public', 'icon.png')

    const n = new Notification({
      title: `⏰ ${reminder.title}`,
      body: reminder.body || 'DeskNote Pro Reminder',
      icon: iconPath,
      urgency: 'normal',
      timeoutType: 'default',
      actions: [
        { type: 'button', text: 'Snooze 5 min' },
        { type: 'button', text: 'Dismiss' },
      ],
    })

    n.on('action', (_e, index) => {
      if (index === 0) this.snooze(reminder.id, 5)
      else this.dismiss(reminder.id)
    })

    n.on('click', () => {
      // Focus main window
      const wins = BrowserWindow.getAllWindows()
      if (wins.length) { wins[0].show(); wins[0].focus() }
    })

    n.show()
  }

  snooze(id: string, minutes: number) {
    const timer = this.activeAlarms.get(id)
    if (timer) { clearInterval(timer); this.activeAlarms.delete(id) }

    const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString()
    this.db.updateReminder(id, { snoozedUntil })

    // Re-fire after snooze duration
    const t = setTimeout(() => {
      const reminder = this.db.getReminders().find(r => r.id === id)
      if (reminder) this.fireReminder(reminder)
    }, minutes * 60 * 1000)
    this.activeAlarms.set(id + ':snooze', t)
  }

  dismiss(id: string) {
    const timer = this.activeAlarms.get(id)
    if (timer) { clearInterval(timer); this.activeAlarms.delete(id) }

    const reminder = this.db.getReminders().find(r => r.id === id)
    if (!reminder) return

    if (reminder.repeat === 'none') {
      this.db.updateReminder(id, { completed: true })
    } else {
      // Schedule next occurrence
      const next = this.getNextOccurrence(reminder)
      this.db.updateReminder(id, { dueAt: next.toISOString(), snoozedUntil: null })
    }
  }

  private getNextOccurrence(reminder: Reminder): Date {
    const base = new Date(reminder.dueAt)
    switch (reminder.repeat) {
      case 'daily':   base.setDate(base.getDate() + 1); break
      case 'weekly':  base.setDate(base.getDate() + 7); break
      case 'monthly': base.setMonth(base.getMonth() + 1); break
      default:        break
    }
    return base
  }
}
