import { NoteColor } from './types'

export interface ColorConfig {
  name: NoteColor
  label: string
  bg: string
  text: string
  border: string
  hex: string
}

export const NOTE_COLORS: ColorConfig[] = [
  { name: 'yellow',  label: 'Yellow',  bg: '#fef9c3', text: '#713f12', border: '#fde047', hex: '#fbbf24' },
  { name: 'blue',    label: 'Blue',    bg: '#dbeafe', text: '#1e3a5f', border: '#93c5fd', hex: '#60a5fa' },
  { name: 'green',   label: 'Green',   bg: '#d1fae5', text: '#064e3b', border: '#6ee7b7', hex: '#34d399' },
  { name: 'purple',  label: 'Purple',  bg: '#ede9fe', text: '#4c1d95', border: '#c4b5fd', hex: '#c084fc' },
  { name: 'pink',    label: 'Pink',    bg: '#fce7f3', text: '#831843', border: '#f9a8d4', hex: '#f472b6' },
  { name: 'red',     label: 'Red',     bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5', hex: '#f87171' },
  { name: 'gray',    label: 'Gray',    bg: '#f1f5f9', text: '#1e293b', border: '#cbd5e1', hex: '#94a3b8' },
  { name: 'dark',    label: 'Dark',    bg: '#1e293b', text: '#cbd5e1', border: '#334155', hex: '#1e293b' },
  { name: 'white',   label: 'White',   bg: '#ffffff', text: '#111827', border: '#e5e7eb', hex: '#ffffff' },
]

export const COLOR_MAP = Object.fromEntries(
  NOTE_COLORS.map(c => [c.name, c])
) as Record<NoteColor, ColorConfig>

export const DEFAULT_NOTE_SIZE = { width: 280, height: 200 }
export const MIN_NOTE_SIZE    = { width: 180, height: 120 }
export const MAX_NOTE_SIZE    = { width: 600, height: 800 }
