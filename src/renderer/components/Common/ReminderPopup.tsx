import React from 'react'
import { useStore } from '../../store/useStore'
import type { Reminder } from '@shared/types'

export default function ReminderPopup() {
  const { pendingReminders, dismissPendingReminder, updateReminder, openEditor } = useStore()

  if (pendingReminders.length === 0) return null

  const reminder = pendingReminders[0]

  async function snooze(minutes: number) {
    if (window.electronAPI) await window.electronAPI.reminders.snooze(reminder.id, minutes)
    dismissPendingReminder(reminder.id)
  }

  async function complete() {
    if (window.electronAPI) await window.electronAPI.reminders.complete(reminder.id)
    updateReminder(reminder.id, { completed: true })
    dismissPendingReminder(reminder.id)
  }

  function openNote() {
    if (reminder.noteId) openEditor(reminder.noteId)
    dismissPendingReminder(reminder.id)
  }

  return (
    <div className="fixed bottom-5 right-5 w-80 z-50 anim-slide-up">
      {/* Stack indicator for multiple reminders */}
      {pendingReminders.length > 1 && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center z-10">
          {pendingReminders.length}
        </div>
      )}

      <div className="bg-[var(--bg-2)] border border-[var(--border-2)] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-[var(--accent)] to-[#60a5fa]" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="text-2xl">🔔</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[var(--text-1)] truncate">{reminder.title}</div>
              {reminder.body && (
                <div className="text-xs text-[var(--text-2)] mt-0.5 line-clamp-2">{reminder.body}</div>
              )}
              <div className="text-[10px] text-[var(--text-3)] mt-1 font-mono flex items-center gap-1">
                <i className="ti ti-clock text-[var(--accent)]" />
                {reminder.repeat !== 'none' ? `${reminder.repeat} reminder` : 'One-time reminder'}
              </div>
            </div>
            <button
              onClick={() => dismissPendingReminder(reminder.id)}
              className="w-6 h-6 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] cursor-pointer border-none shrink-0 transition-colors"
            >
              <i className="ti ti-x text-xs" />
            </button>
          </div>

          {/* Snooze buttons */}
          <div className="flex gap-1.5 mb-2">
            {[5, 15, 30].map(min => (
              <button
                key={min}
                onClick={() => snooze(min)}
                className="flex-1 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] cursor-pointer transition-all"
              >
                <i className="ti ti-clock-snooze text-[10px]" /> {min}m
              </button>
            ))}
          </div>

          {/* Primary actions */}
          <div className="flex gap-1.5">
            {reminder.noteId && (
              <button
                onClick={openNote}
                className="flex-1 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] cursor-pointer transition-all"
              >
                <i className="ti ti-note" /> Open Note
              </button>
            )}
            <button
              onClick={complete}
              className="flex-1 py-1.5 rounded-lg bg-[var(--accent)] border-none text-white text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
            >
              <i className="ti ti-check" /> Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
