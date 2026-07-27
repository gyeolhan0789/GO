#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let raw = '';
try {
  raw = fs.readFileSync(0, 'utf8');
} catch (e) {
  raw = '';
}

let payload = {};
try {
  payload = raw ? JSON.parse(raw) : {};
} catch (e) {
  payload = {};
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

// Only gate Edit/Write. Reading files in the main tree is harmless.
const toolName = payload.tool_name;
if (toolName !== 'Edit' && toolName !== 'Write') {
  process.exit(0);
}

const filePath = (payload.tool_input && payload.tool_input.file_path) || '';
if (!filePath) {
  process.exit(0);
}

// Files already inside a linked worktree (backend/.worktrees/<name>/...) are
// isolated by definition — nothing to enforce there.
const normalized = filePath.replace(/\\/g, '/');
if (/\/\.worktrees\//i.test(normalized)) {
  process.exit(0);
}

// Enforcement is opt-in: only branches the user has explicitly listed in
// backend/.worktree (one branch name per line) are confined to a
// linked worktree. No marker file / no matching line => no enforcement.
const markerPath = path.join(__dirname, '..', '..', '.worktree');
let requiredBranches = [];
try {
  requiredBranches = fs
    .readFileSync(markerPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
} catch (e) {
  process.exit(0); // no marker file => enforcement is off
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
} catch (e) {
  process.exit(0); // not a git repo / detached HEAD / git unavailable — fail open
}

if (requiredBranches.includes('*') || requiredBranches.includes(branch)) {
  deny(
    `Branch '${branch}' is listed in .worktree, but '${filePath}' is being edited directly in the main working tree. ` +
      `Create or use a linked worktree under backend/.worktrees/ for this branch and edit there instead.`
  );
}

process.exit(0);
