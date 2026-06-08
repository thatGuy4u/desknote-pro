import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import type { Reminder } from '@shared/types'

export function useAppInit() {
  const { setNotes, setReminders, setSettings, setLoading, addPendingReminder, openEditor, setView } = useStore()

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        if (window.electronAPI) {
          const [notes, reminders, settings] = await Promise.all([
            window.electronAPI.notes.getAll(),
            window.electronAPI.reminders.getAll(),
            window.electronAPI.settings.get(),
          ])
          setNotes(notes)
          setReminders(reminders)
          setSettings(settings)
          applyTheme(settings.theme)
        } else {
          console.warn('DeskNote Pro: running outside Electron — use npm run dev for the desktop app.')
        }
      } catch (e) {
        console.error('Init error:', e)
      } finally {
        setLoading(false)
      }
    }

    init()

    const api = window.electronAPI
    if (!api) return

    const onReminderFired = (reminder: unknown) => {
      addPendingReminder(reminder as Reminder)
    }

    const onQuickCapture = () => {
      api.window.focus()
      openEditor(null)
    }

    const onNavReminders = () => {
      api.window.focus()
      setView('reminders')
    }

    const onNavSettings = () => {
      api.window.focus()
      setView('settings')
    }

    const onThemeUpdated = (isDark: unknown) => {
      document.documentElement.classList.toggle('dark', Boolean(isDark))
    }

    api.on('reminders:fired', onReminderFired)
    api.on('note:quickCapture', onQuickCapture)
    api.on('nav:reminders', onNavReminders)
    api.on('nav:settings', onNavSettings)
    api.on('theme:updated', onThemeUpdated)

    return () => {
      api.off('reminders:fired', onReminderFired)
      api.off('note:quickCapture', onQuickCapture)
      api.off('nav:reminders', onNavReminders)
      api.off('nav:settings', onNavSettings)
      api.off('theme:updated', onThemeUpdated)
    }
  }, [])

  // Desktop keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        useStore.getState().openEditor(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

function applyTheme(theme: string) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    // System
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
}

