import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Reminder, RepeatMode } from '@shared/types'
import { v4 as uuid } from 'uuid'

const REPEAT_LABELS: Record<RepeatMode, string> = {
  none: 'One-time', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
}

const REMINDER_COLORS = ['#3b82f6', '#f87171', '#34d399', '#fbbf24', '#60a5fa', '#f472b6']

export default function RemindersView() {
  const { reminders, addReminder, updateReminder, removeReminder } = useStore()
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [fTitle, setFTitle]   = useState('')
  const [fBody, setFBody]     = useState('')
  const [fDate, setFDate]     = useState('')
  const [fTime, setFTime]     = useState('')
  const [fRepeat, setFRepeat] = useState<RepeatMode>('none')

  const active    = reminders.filter(r => !r.completed)
  const completed = reminders.filter(r => r.completed)

  async function createReminder() {
    if (!fTitle || !fDate || !fTime) return
    const dueAt = new Date(`${fDate}T${fTime}`).toISOString()
    const data: Omit<Reminder, 'id' | 'createdAt'> = {
      noteId: null, title: fTitle, body: fBody, dueAt,
      repeat: fRepeat, sound: 'system', volume: 80,
      snoozedUntil: null, completed: false,
    }
    if (window.electronAPI) {
      const created = await window.electronAPI.reminders.create(data)
      addReminder(created)
    } else {
      addReminder({ ...data, id: uuid(), createdAt: new Date().toISOString() })
    }
    setFTitle(''); setFBody(''); setFDate(''); setFTime(''); setFRepeat('none')
    setShowForm(false)
  }

  async function completeReminder(id: string) {
    if (window.electronAPI) await window.electronAPI.reminders.complete(id)
    updateReminder(id, { completed: true })
  }

  async function deleteReminder(id: string) {
    if (window.electronAPI) await window.electronAPI.reminders.delete(id)
    removeReminder(id)
  }

  function formatDue(dueAt: string) {
    const d = new Date(dueAt)
    const now = new Date()
    const diff = d.getTime() - now.getTime()
    if (diff < 0) return 'Overdue'
    if (diff < 3600000) return `In ${Math.round(diff / 60000)} min`
    if (diff < 86400000) return `Today at ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
    if (diff < 172800000) return `Tomorrow at ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function isOverdue(dueAt: string) {
    return new Date(dueAt) < new Date()
  }

  const ReminderCard = ({ r }: { r: Reminder }) => {
    const color = REMINDER_COLORS[r.id.charCodeAt(0) % REMINDER_COLORS.length]
    const overdue = isOverdue(r.dueAt) && !r.completed

    return (
      <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 hover:translate-x-0.5 ${overdue ? 'bg-red-500/5 border-red-500/20' : 'bg-[var(--bg-3)] border-[var(--border)] hover:border-[var(--border-2)]'}`}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: color + '22' }}>
          {r.repeat !== 'none' ? '🔁' : overdue ? '⚠️' : '🔔'}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold truncate ${r.completed ? 'line-through opacity-50' : ''}`}>{r.title}</div>
          {r.body && <div className="text-xs text-[var(--text-2)] truncate mt-0.5">{r.body}</div>}
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-mono ${overdue ? 'text-red-400' : 'text-[var(--text-3)]'}`}>
              <i className="ti ti-clock" /> {formatDue(r.dueAt)}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: color + '22', color }}>
              {REPEAT_LABELS[r.repeat]}
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {!r.completed && (
            <button onClick={() => completeReminder(r.id)} title="Mark done"
              className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 border-none cursor-pointer flex items-center justify-center text-sm transition-all">
              <i className="ti ti-check" />
            </button>
          )}
          <button onClick={() => deleteReminder(r.id)} title="Delete"
            className="w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-3)] hover:text-red-400 hover:bg-red-500/10 cursor-pointer flex items-center justify-center text-sm transition-all">
            <i className="ti ti-trash" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-[var(--border)] bg-[var(--bg-2)] shrink-0">
        <span className="text-base font-semibold">Reminders</span>
        <span className="text-xs text-[var(--text-3)]">{active.length} upcoming</span>
        <div className="ml-auto">
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity shadow-md shadow-[var(--accent)]/30"
          >
            <i className={`ti ${showForm ? 'ti-x' : 'ti-plus'}`} /> {showForm ? 'Cancel' : 'New Reminder'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Create form */}
        {showForm && (
          <div className="bg-[var(--bg-3)] border border-[var(--border)] rounded-2xl p-4 space-y-3 anim-fade-up">
            <h3 className="text-sm font-semibold text-[var(--text-1)]">New Reminder</h3>
            <input
              value={fTitle} onChange={e => setFTitle(e.target.value)}
              placeholder="Reminder title…"
              className="w-full bg-[var(--bg-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
            />
            <input
              value={fBody} onChange={e => setFBody(e.target.value)}
              placeholder="Description (optional)…"
              className="w-full bg-[var(--bg-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date" value={fDate} onChange={e => setFDate(e.target.value)}
                className="bg-[var(--bg-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--accent)] transition-colors"
              />
              <input
                type="time" value={fTime} onChange={e => setFTime(e.target.value)}
                className="bg-[var(--bg-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            <div className="flex gap-1.5">
              {(['none', 'daily', 'weekly', 'monthly'] as RepeatMode[]).map(r => (
                <button
                  key={r} onClick={() => setFRepeat(r)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium border cursor-pointer transition-all ${fRepeat === r ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'bg-transparent border-[var(--border)] text-[var(--text-2)]'}`}
                >
                  {REPEAT_LABELS[r]}
                </button>
              ))}
            </div>
            <button
              onClick={createReminder}
              disabled={!fTitle || !fDate || !fTime}
              className="w-full py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold border-none cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              <i className="ti ti-bell-plus" /> Create Reminder
            </button>
          </div>
        )}

        {/* Active */}
        {active.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-3)] mb-3 px-1">Upcoming</h4>
            <div className="space-y-2">
              {active.map(r => <ReminderCard key={r.id} r={r} />)}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-3)] mb-3 px-1">Completed</h4>
            <div className="space-y-2 opacity-60">
              {completed.map(r => <ReminderCard key={r.id} r={r} />)}
            </div>
          </div>
        )}

        {reminders.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--text-3)] gap-3">
            <i className="ti ti-bell-off text-5xl opacity-30" />
            <p className="text-sm">No reminders yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
