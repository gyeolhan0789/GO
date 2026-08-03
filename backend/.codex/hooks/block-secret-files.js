#!/usr/bin/env node
'use strict';

const fs = require('fs');

function readPayload() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

const payload = readPayload();
const filePath = payload.tool_input?.file_path || '';

// .env(.local/.prod/...) files may carry DB credentials / JWT secrets —
// direct Read/Edit/Write is blocked. Profile-specific application ymls for
// production/staging aren't tracked in this repo (those envs are configured
// via env vars / CI secrets, not committed yaml), so they're not matched here.
const SECRET_PATTERNS = [
  /\.env(\.[\w-]+)?$/i,
];

if (SECRET_PATTERNS.some((pattern) => pattern.test(filePath))) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `'${filePath}' may contain secrets (DB credentials, JWT secret, etc.) and is blocked from direct access by project hook policy. Ask the user to share only the specific value you need instead of reading the whole file.`,
    },
  }));
}

process.exit(0);
