import koffi from 'koffi'
import type { BrowserWindow } from 'electron'

const WM_SPAWN_WORKER = 0x052c
const SMTO_NORMAL = 0

const user32 = koffi.load('user32.dll')

const FindWindowA = user32.func('void* __stdcall FindWindowA(str, str)')
const FindWindowExA = user32.func('void* __stdcall FindWindowExA(void*, void*, str, str)')
const SetParent = user32.func('void* __stdcall SetParent(void*, void*)')
const SendMessageTimeoutA = user32.func(
  'int __stdcall SendMessageTimeoutA(void*, uint, uintptr, uintptr, uint, uint, uintptr*)'
)

const EnumWindowsProc = koffi.proto('bool __stdcall EnumWindowsProc(void* hwnd, intptr_t lParam)')
const EnumWindows = user32.func('bool __stdcall EnumWindows(EnumWindowsProc* lpEnumFunc, intptr_t lParam)')

const attachedWindows = new WeakSet<BrowserWindow>()

function hwndFromWindow(win: BrowserWindow): unknown {
  const buf = win.getNativeWindowHandle()
  return buf.length >= 8 ? buf.readBigUInt64LE(0) : BigInt(buf.readUInt32LE(0))
}

function findWorkerW(): unknown | null {
  const progman = FindWindowA('Progman', null)
  if (!progman) return null

  SendMessageTimeoutA(progman, WM_SPAWN_WORKER, 0, 0, SMTO_NORMAL, 1000, null)

  let workerW: unknown | null = null

  const cb = koffi.register((hwnd: unknown, _lparam: number) => {
    const defView = FindWindowExA(hwnd, null, 'SHELLDLL_DefView', null)
    if (defView) {
      const worker = FindWindowExA(null, hwnd, 'WorkerW', null)
      if (worker) {
        workerW = worker
        return false
      }
    }
    return true
  }, koffi.pointer(EnumWindowsProc))

  EnumWindows(cb, 0)
  koffi.unregister(cb)

  return workerW
}

/** Parent the Electron window to the desktop WorkerW layer (Windows only). */
export function attachWindowToDesktopLayer(win: BrowserWindow): boolean {
  if (process.platform !== 'win32') return false

  try {
    const workerW = findWorkerW()
    if (!workerW) {
      console.warn('[DeskNote] WorkerW not found — desktop layer unavailable')
      return false
    }

    win.setAlwaysOnTop(false)
    SetParent(hwndFromWindow(win), workerW)
    attachedWindows.add(win)
    return true
  } catch (err) {
    console.error('[DeskNote] attachWindowToDesktopLayer failed:', err)
    return false
  }
}

export function detachWindowFromDesktopLayer(win: BrowserWindow): void {
  if (process.platform !== 'win32' || !attachedWindows.has(win)) return

  try {
    SetParent(hwndFromWindow(win), null)
    attachedWindows.delete(win)
  } catch (err) {
    console.error('[DeskNote] detachWindowFromDesktopLayer failed:', err)
  }
}

export function isAttachedToDesktopLayer(win: BrowserWindow): boolean {
  return attachedWindows.has(win)
}
