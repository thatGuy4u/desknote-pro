import Store from 'electron-store'
import type { AppSettings } from '../shared/types'

const DEFAULTS: AppSettings = {
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

export class SettingsService {
  private store: Store<AppSettings>

  constructor() {
    this.store = new Store<AppSettings>({
      name: 'settings',
      defaults: DEFAULTS,
    })
  }

  get(): AppSettings {
    return this.store.store
  }

  set(patch: Partial<AppSettings>): AppSettings {
    for (const [key, value] of Object.entries(patch)) {
      this.store.set(key as keyof AppSettings, value as AppSettings[keyof AppSettings])
    }
    return this.get()
  }

  reset(): AppSettings {
    this.store.clear()
    return this.get()
  }
}
