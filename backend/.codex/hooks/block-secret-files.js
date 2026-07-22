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
const secretPatterns = [
  /\.env(\.[\w-]+)?$/i,
  /application-(local|dev|prod|production|staging|stage)\.ya?ml$/i,
];

if (secretPatterns.some((pattern) => pattern.test(filePath))) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `'${filePath}' may contain credentials or JWT secrets and is blocked by project policy. Ask for only the specific value needed instead of reading the file.`,
    },
  }));
}
