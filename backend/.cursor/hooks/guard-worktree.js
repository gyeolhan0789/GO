#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { readPayload, cursorDeny, getFilePath } = require('./hook-common');

const payload = readPayload();

// Only gate Write/StrReplace (Cursor) and Edit (Claude-compat preToolUse).
const toolName = payload.tool_name;
if (
  toolName &&
  toolName !== 'Edit' &&
  toolName !== 'Write' &&
  toolName !== 'StrReplace'
) {
  process.exit(0);
}

const filePath = getFilePath(payload);
if (!filePath) {
  process.exit(0);
}

const normalized = filePath.replace(/\\/g, '/');
if (/\/\.worktrees\//i.test(normalized)) {
  process.exit(0);
}

const markerPath = path.join(__dirname, '..', '..', '.worktree');
let requiredBranches = [];
try {
  requiredBranches = fs
    .readFileSync(markerPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
} catch {
  process.exit(0);
}

if (requiredBranches.length === 0) {
  process.exit(0);
}

let branch = '';
try {
  branch = execSync('git rev-parse --abbrev-ref HEAD', {
    cwd: path.dirname(filePath),
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .trim();
} catch {
  process.exit(0);
}

if (requiredBranches.includes('*') || requiredBranches.includes(branch)) {
  cursorDeny(
    `Branch '${branch}' is listed in .worktree, but '${filePath}' is being edited directly in the main working tree. Create or use a linked worktree under backend/.worktrees/ for this branch and edit there instead.`
  );
}

process.exit(0);
