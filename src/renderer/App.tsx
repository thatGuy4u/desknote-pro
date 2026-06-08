import React from 'react'
import { useAppInit } from './hooks/useAppInit'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar/Sidebar'
import NotesView from './components/Notes/NotesView'
import RemindersView from './components/Reminders/RemindersView'
import DesktopView from './components/Desktop/DesktopView'
import SettingsView from './components/Settings/SettingsView'
import NoteEditor from './components/Editor/NoteEditor'
import ReminderPopup from './components/Common/ReminderPopup'
import LoadingScreen from './components/Common/LoadingScreen'

export default function App() {
  useAppInit()

  const { view, isLoading } = useStore()

  if (isLoading) return <LoadingScreen />

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-1)] text-[var(--text-1)]">
      <Sidebar />

      <main className="flex flex-1 overflow-hidden relative">
        {view === 'all' || view === 'pinned' || view === 'favorites' || view === 'archived'
          ? <NotesView />
          : view === 'reminders'
          ? <RemindersView />
          : view === 'desktop'
          ? <DesktopView />
          : view === 'settings'
          ? <SettingsView />
          : null
        }

        <NoteEditor />
      </main>

      <ReminderPopup />
    </div>
  )
}
