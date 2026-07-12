// scripts/wait-and-launch.js
// Waits for Vite dev server then launches Electron.

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 5173;
const POLL_MS = 500;
const TIMEOUT_MS = 30000;
const PROJECT_ROOT = path.resolve(__dirname, '..');

const start = Date.now();

function check() {
  if (Date.now() - start > TIMEOUT_MS) {
    console.error('Timed out waiting for Vite dev server on port ' + PORT);
    process.exit(1);
  }

  const req = http.get(`http://localhost:${PORT}`, (res) => {
    res.resume();
    if (res.statusCode === 200) {
      console.log('Vite dev server ready, launching Electron...');
      launchElectron();
    } else {
      retry();
    }
  });

  req.on('error', retry);
  req.setTimeout(2000, () => { req.destroy(); retry(); });
}

function retry() {
  setTimeout(check, POLL_MS);
}

function launchElectron() {
  const electronPath = require('electron');
  const child = spawn(String(electronPath), [PROJECT_ROOT], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });

  child.on('close', (code) => {
    process.exit(code ?? 0);
  });
}

check();
