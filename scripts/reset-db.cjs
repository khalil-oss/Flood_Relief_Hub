#!/usr/bin/env node
/**
 * Restore public/db/db.json from public/db/db.json.backup.
 * Cross-platform replacement for the old `cp ... 2>/dev/null || ...` npm script.
 */
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'public', 'db', 'db.json');
const backupPath = path.join(__dirname, '..', 'public', 'db', 'db.json.backup');

if (!fs.existsSync(backupPath)) {
  console.error('No backup found at', backupPath);
  console.error('Run `npm run seed` first to create one.');
  process.exit(1);
}

fs.copyFileSync(backupPath, dbPath);
console.log('Database restored from', backupPath);
