# 📌 DeskNote Pro

> Premium Sticky Notes & Reminder Desktop App — Electron + React + TypeScript

---

## ✨ Features

- **Always-On-Desktop Mode** — Notes survive workspace switching, three-finger swipes, Mission Control, and virtual desktops via `visibleOnAllWorkspaces` + `alwaysOnTop`
- **Desktop Layer Mode** — Pin notes directly to the wallpaper layer (below all windows)
- **Rich Note Editor** — Text, checklists, colors, opacity slider, lock/encrypt
- **Reminder Engine** — Daily/weekly/monthly repeats, snooze, native OS notifications
- **System Tray** — Runs in background, always accessible
- **Global Shortcut** — `Ctrl+Shift+N` for instant quick capture
- **SQLite Persistence** — All notes, reminders, positions stored locally
- **Auto-restore** — Pinned notes reopen automatically on boot
- **Dark / Light / System theme**

---

## 📁 Project Structure

```
desknote-pro/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # App entry, window creation, startup
│   │   ├── preload.ts           # Secure IPC bridge (contextBridge)
│   │   ├── database.ts          # SQLite via better-sqlite3
│   │   ├── settings.ts          # electron-store settings
│   │   ├── reminderEngine.ts    # Scheduled reminder firing + notifications
│   │   ├── noteWindowManager.ts # Floating note windows, desktop modes
│   │   ├── tray.ts              # System tray menu
│   │   └── ipcHandlers.ts       # IPC channel handlers
│   │
│   ├── renderer/                # React frontend
│   │   ├── App.tsx              # Root component
│   │   ├── main.tsx             # React entry point
│   │   ├── note.tsx             # Floating sticky note window
│   │   ├── index.html           # Main window HTML
│   │   ├── note.html            # Floating note HTML
│   │   ├── store/
│   │   │   └── useStore.ts      # Zustand global state
│   │   ├── hooks/
│   │   │   └── useAppInit.ts    # Data loading + IPC event listeners
│   │   ├── components/
│   │   │   ├── Sidebar/         # Navigation sidebar
│   │   │   ├── Notes/           # Grid view + NoteCard
│   │   │   ├── Editor/          # Full note editor panel
│   │   │   ├── Reminders/       # Reminders view + create form
│   │   │   ├── Desktop/         # Desktop layer canvas
│   │   │   ├── Settings/        # Settings panel
│   │   │   └── Common/          # ReminderPopup, LoadingScreen
│   │   ├── styles/
│   │   │   └── globals.css      # Tailwind + CSS variables
│   │   └── types/
│   │       └── electron.d.ts    # window.electronAPI types
│   │
│   └── shared/                  # Shared between main + renderer
│       ├── types.ts             # Note, Reminder, Settings interfaces + IPC channels
│       └── colors.ts            # Color palette constants
│
├── public/                      # Static assets (icons)
├── scripts/                     # Build scripts
├── package.json
├── tsconfig.json                # Renderer TypeScript config
├── tsconfig.main.json           # Main process TypeScript config
├── vite.config.ts               # Vite bundler config
├── tailwind.config.js
└── postcss.config.js
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
# Install dependencies
npm install

# Rebuild native modules for Electron
npm run electron-rebuild

# Development (renderer + main process with hot reload)
npm run dev

# In a second terminal, start Electron
npm run electron:dev
```

### Build for Production

```bash
# Build all
npm run build

# Package for current platform
npm run dist

# Platform-specific
npm run dist:mac    # macOS .dmg
npm run dist:win    # Windows .exe
npm run dist:linux  # Linux AppImage + .deb
```

---

## ⚙️ Architecture

### Desktop Pinning (Critical Feature)

DeskNote Pro uses Electron's window management APIs to ensure notes survive all workspace changes:

```typescript
// Always-on-Top mode — floats above all windows on all workspaces
win.setAlwaysOnTop(true, 'floating')
win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })
win.setSkipTaskbar(true)

// Desktop Layer mode — sits below all windows, above wallpaper
win.setAlwaysOnTop(true, 'desktop')       // Windows/Linux
win.setAlwaysOnTop(true, 'desktop', 1)    // macOS kCGDesktopIconWindowLevel
win.setVisibleOnAllWorkspaces(true)
```

This means notes:
- ✅ Survive three-finger swipe gestures
- ✅ Survive Mission Control (macOS)
- ✅ Survive virtual desktop switching (all platforms)
- ✅ Persist after restart (restored from SQLite on boot)

### IPC Architecture

All communication between renderer and main uses a typed IPC bridge:

```
Renderer (React) → contextBridge → preload.ts → ipcMain → Services
```

The `window.electronAPI` object is exposed via `contextBridge.exposeInMainWorld`, keeping `nodeIntegration: false` and `contextIsolation: true` for security.

### Data Flow

```
User action → Zustand store (optimistic update) → electronAPI.notes.update() → SQLite
```

State is kept in Zustand with immediate UI updates, then persisted to SQLite asynchronously.

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 28 |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS 3 + CSS Variables |
| Animations | Framer Motion / CSS animations |
| State | Zustand |
| Database | better-sqlite3 (SQLite) |
| Settings | electron-store |
| Reminders | node-schedule |
| Build | Vite 5 |
| Package | electron-builder |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/⌘ + N` | New Note |
| `Ctrl/⌘ + Shift + N` | Quick Capture (global) |
| `Ctrl/⌘ + F` | Focus Search |
| `Ctrl/⌘ + R` | New Reminder |
| `Escape` | Close Editor |

---

## 🔧 Configuration

Settings are stored in:
- **macOS**: `~/Library/Application Support/DeskNote Pro/settings.json`
- **Windows**: `%APPDATA%\DeskNote Pro\settings.json`
- **Linux**: `~/.config/DeskNote Pro/settings.json`

Database is stored as `desknote.db` in the same directory.

---

## 📦 Adding Icons

Place your icons in the `public/` folder:
- `public/icon.icns` — macOS
- `public/icon.ico` — Windows
- `public/icon.png` — Linux (512×512)
- `public/tray-icon.png` — Tray icon (16×16 or 32×32)

---

## 🛡️ Security

- `contextIsolation: true` — Renderer cannot access Node.js APIs directly
- `nodeIntegration: false` — No direct Node in renderer
- `sandbox: false` — Required for preload IPC only
- Locked notes use local AES encryption (implement with `node:crypto`)
- All IPC channels are allowlisted in preload

---

## 📄 License

MIT © DeskNote Pro
