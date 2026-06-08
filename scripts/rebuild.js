#!/usr/bin/env node
/**
 * Rebuilds native Node modules (better-sqlite3) for the current Electron version.
 * Requires Windows Build Tools (C++ workload) or Xcode on macOS.
 *
 * Usage: npm run rebuild:native
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const root = path.resolve(__dirname, '..')
const rebuildCli = path.join(root, 'node_modules', '@electron', 'rebuild', 'lib', 'cli.js')

if (!fs.existsSync(rebuildCli)) {
  console.error('❌ @electron/rebuild is not installed.')
  console.error('   Run: npm install')
  process.exit(1)
}

console.log('🔧 Rebuilding native modules for Electron...\n')

try {
  execSync(`node "${rebuildCli}" -f -w better-sqlite3`, {
    stdio: 'inherit',
    cwd: root,
  })
  console.log('\n✅ Native modules rebuilt successfully!')
} catch (err) {
  console.error('\n❌ Rebuild failed:', err.message)
  console.log('\nMake sure you have build tools installed:')
  console.log('  Windows: Visual Studio Build Tools → "Desktop development with C++"')
  console.log('  macOS:   xcode-select --install')
  console.log('\nThen retry: npm run rebuild:native')
  process.exit(1)
}
