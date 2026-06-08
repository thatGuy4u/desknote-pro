import { app } from 'electron'
import path from 'path'

export function getPublicPath(...segments: string[]): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'public')
    : path.join(app.getAppPath(), 'public')
  return path.join(base, ...segments)
}
