#!/usr/bin/env node
/**
 * Cross-platform launcher for the Python ML service.
 *
 * Usage:
 *   node scripts/run-ml.cjs            # start FastAPI on port 8000
 *   node scripts/run-ml.cjs --test     # run pytest inside ml-service
 *
 * It prefers the local virtualenv (ml-service/.venv) and falls back to
 * PYTHON, python3, or python on PATH.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mlDir = path.join(root, 'ml-service');
const isWindows = process.platform === 'win32';

const venvPython = isWindows
  ? path.join(mlDir, '.venv', 'Scripts', 'python.exe')
  : path.join(mlDir, '.venv', 'bin', 'python');

const python = fs.existsSync(venvPython)
  ? venvPython
  : process.env.PYTHON || (isWindows ? 'python' : 'python3');

const testMode = process.argv.includes('--test');
const port = process.env.ML_PORT || '8000';

const args = testMode
  ? ['-m', 'pytest', '-q']
  : ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(port)];

console.log(`[ml] using: ${python}`);
console.log(`[ml] ${testMode ? 'running tests' : `starting FastAPI on http://127.0.0.1:${port}`}`);

const child = spawn(python, args, { cwd: mlDir, stdio: 'inherit' });

child.on('error', (err) => {
  console.error('[ml] failed to start Python:', err.message);
  console.error('[ml] Install Python 3.11+ and run:');
  console.error(`[ml]   ${isWindows ? 'python' : 'python3'} -m venv ml-service/.venv`);
  console.error(`[ml]   ${isWindows ? 'ml-service\\.venv\\Scripts\\python.exe' : 'ml-service/.venv/bin/python'} -m pip install -r ml-service/requirements.txt`);
  process.exit(1);
});

child.on('exit', (code) => process.exit(code ?? 0));

const forward = (signal) => child.kill(signal);
process.on('SIGINT', () => forward('SIGINT'));
process.on('SIGTERM', () => forward('SIGTERM'));
