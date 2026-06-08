import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import type { AppSettings, ThemeMode } from '@shared/types'

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-9 h-5 rounded-full relative transition-all border-none cursor-pointer shrink-0 ${on ? 'bg-[var(--accent)]' : 'bg-[var(--bg-4)]'}`}
    >
      <span className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all shadow-sm ${on ? 'left-4' : 'left-0.5'}`} />
    </button>
  )
}

export default function SettingsView() {
  const { settings, setSettings } = useStore()
  const [saved, setSaved] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')

  if (!settings) return null

  async function update(patch: Partial<AppSettings>) {
    const next = { ...settings!, ...patch }
    if (window.electronAPI) await window.electronAPI.settings.set(patch)
    setSettings(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function applyTheme(theme: ThemeMode) {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else if (theme === 'light') root.classList.remove('dark')
    else root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches)
    update({ theme })
  }

  const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <div className="bg-[var(--bg-3)] border border-[var(--border)] rounded-2xl overflow-hidden mb-4">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
        <i className={`ti ${icon} text-[var(--accent)]`} />
        <span className="text-sm font-semibold text-[var(--text-1)]">{title}</span>
      </div>
      <div className="divide-y divide-[var(--border)]">{children}</div>
    </div>
  )

  const Row = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--text-1)]">{label}</div>
        {desc && <div className="text-xs text-[var(--text-3)] mt-0.5">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-3 px-5 h-14 border-b border-[var(--border)] bg-[var(--bg-2)] shrink-0">
        <span className="text-base font-semibold">Settings</span>
        {saved && (
          <span className="text-xs text-green-400 flex items-center gap-1 anim-fade-up">
            <i className="ti ti-check" /> Saved
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Appearance */}
        <Section title="Appearance" icon="ti-palette">
          <Row label="Theme" desc="Choose your preferred color scheme">
            <div className="flex gap-1">
              {(['dark', 'light', 'system'] as ThemeMode[]).map(t => (
                <button
                  key={t} onClick={() => applyTheme(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border cursor-pointer capitalize transition-all ${settings.theme === t ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'bg-transparent border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-2)]'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Glassmorphism Effects" desc="Blur and frosted glass panels">
            <Toggle on={settings.glassmorphism} onToggle={() => update({ glassmorphism: !settings.glassmorphism })} />
          </Row>
          <Row label="Smooth Animations" desc="Framer Motion transitions">
            <Toggle on={settings.animations} onToggle={() => update({ animations: !settings.animations })} />
          </Row>
          <Row label="Default Opacity" desc={`New notes start at ${settings.defaultOpacity}%`}>
            <div className="flex items-center gap-2">
              <input
                type="range" min={20} max={100} step={10}
                value={settings.defaultOpacity}
                onChange={e => update({ defaultOpacity: Number(e.target.value) })}
                className="w-24"
              />
              <span className="text-xs font-mono text-[var(--accent)] w-8 text-right">{settings.defaultOpacity}%</span>
            </div>
          </Row>
        </Section>

        {/* Desktop & Pinning */}
        <Section title="Desktop & Pinning" icon="ti-device-desktop">
          <Row label="Visible on All Workspaces" desc="Notes survive desktop/workspace switching">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-green-400 bg-green-400/10 px-2 py-0.5 rounded">ALWAYS ON</span>
            </div>
          </Row>
          <Row label="Restore Pinned Notes on Boot" desc="Reopen desktop notes after restart">
            <Toggle on={settings.restorePinnedOnBoot} onToggle={() => update({ restorePinnedOnBoot: !settings.restorePinnedOnBoot })} />
          </Row>
          <Row label="Default Desktop Mode" desc="For new notes placed on desktop">
            <select
              value={settings.defaultDesktopMode}
              onChange={e => update({ defaultDesktopMode: e.target.value as AppSettings['defaultDesktopMode'] })}
              className="bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--text-1)] outline-none"
            >
              <option value="normal">Normal</option>
              <option value="always-on-top">Always on Top</option>
              <option value="desktop-layer">Desktop Layer</option>
            </select>
          </Row>
        </Section>

        {/* Reminders */}
        <Section title="Reminders & Notifications" icon="ti-bell">
          <Row label="Default Reminder Sound" desc="Sound played when reminder fires">
            <select
              value={settings.reminderSound}
              onChange={e => update({ reminderSound: e.target.value })}
              className="bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--text-1)] outline-none"
            >
              <option value="system">System Default</option>
              <option value="chime">Chime</option>
              <option value="ding">Ding</option>
              <option value="alert">Alert</option>
              <option value="none">No Sound</option>
            </select>
          </Row>
          <Row label="Reminder Volume" desc={`${settings.reminderVolume}%`}>
            <div className="flex items-center gap-2">
              <i className="ti ti-volume text-[var(--text-3)] text-sm" />
              <input
                type="range" min={0} max={100} step={10}
                value={settings.reminderVolume}
                onChange={e => update({ reminderVolume: Number(e.target.value) })}
                className="w-24"
              />
              <span className="text-xs font-mono text-[var(--accent)] w-8 text-right">{settings.reminderVolume}%</span>
            </div>
          </Row>
          <Row label="Default Snooze Duration">
            <select
              value={settings.defaultSnoozeMinutes}
              onChange={e => update({ defaultSnoozeMinutes: Number(e.target.value) })}
              className="bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--text-1)] outline-none"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </Row>
          <Row label="Repeat Alarm Until Dismissed" desc="Keeps alerting every 2 min">
            <Toggle on={settings.repeatAlarmUntilDismissed} onToggle={() => update({ repeatAlarmUntilDismissed: !settings.repeatAlarmUntilDismissed })} />
          </Row>
        </Section>

        {/* Startup */}
        <Section title="Startup & Tray" icon="ti-rocket">
          <Row label="Launch at Startup" desc="Start DeskNote Pro after login">
            <Toggle on={settings.launchAtStartup} onToggle={() => update({ launchAtStartup: !settings.launchAtStartup })} />
          </Row>
          <Row label="Start Minimized" desc="Launch directly to system tray">
            <Toggle on={settings.startMinimized} onToggle={() => update({ startMinimized: !settings.startMinimized })} />
          </Row>
          <Row label="Global Shortcut" desc="Quick capture new note">
            <kbd className="text-[11px] bg-[var(--bg-4)] border border-[var(--border-2)] rounded px-2 py-0.5 font-mono text-[var(--accent)]">
              {settings.globalShortcut.replace('CommandOrControl', '⌃').replace('+', ' + ')}
            </kbd>
          </Row>
        </Section>

        {/* Security & Data */}
        <Section title="Security & Data" icon="ti-shield-lock">
          <Row label="Encrypt Locked Notes" desc="Local AES encryption for locked notes">
            <Toggle on={settings.encryptLockedNotes} onToggle={() => update({ encryptLockedNotes: !settings.encryptLockedNotes })} />
          </Row>
          <Row label="Auto Backup" desc="SQLite backup every 24 hours">
            <Toggle on={settings.autoBackup} onToggle={() => update({ autoBackup: !settings.autoBackup })} />
          </Row>
          <Row label="Backup Now" desc={backupMsg || 'Create a manual backup of your notes database'}>
            <button
              onClick={async () => {
                if (!window.electronAPI?.app?.backup) return
                const path = await window.electronAPI.app.backup()
                setBackupMsg(`Saved to ${path}`)
                setTimeout(() => setBackupMsg(''), 4000)
              }}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--text-2)] cursor-pointer hover:border-[var(--border-2)] hover:text-[var(--text-1)] transition-all"
            >
              <i className="ti ti-database-export" /> Backup
            </button>
          </Row>
        </Section>

        {/* About */}
        <div className="bg-gradient-to-br from-[var(--accent)]/10 to-[#60a5fa]/10 border border-[var(--accent)]/20 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-2">📌</div>
          <div className="text-sm font-semibold text-[var(--text-1)]">DeskNote Pro</div>
          <div className="text-xs text-[var(--text-3)] mt-1">Version 1.0.0 · Production</div>
          <div className="text-[11px] text-[var(--accent)] mt-2">Built with Electron · React · TypeScript</div>
        </div>
      </div>
    </div>
  )
}
